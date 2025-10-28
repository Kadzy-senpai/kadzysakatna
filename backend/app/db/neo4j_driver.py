import os
import logging
from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv()

# URI example for AuraDB: neo4j+s://<your-db-id>.databases.neo4j.io:7687
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")

_driver = None


def init_driver():
    """Initialize the Neo4j driver and verify connectivity.

    For AuraDB use a `neo4j+s://...` URI and the provided username/password.
    This function will call `verify_connectivity()` to fail fast with a clear error
    when configuration is wrong.
    """
    global _driver
    if _driver is not None:
        return

    if not NEO4J_URI:
        raise RuntimeError("NEO4J_URI is not set")

    try:
        _driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        # verify connectivity (this will raise if credentials/uri wrong)
        try:
            _driver.verify_connectivity()
        except Exception as e:
            # close driver and re-raise with helpful message
            try:
                _driver.close()
            except Exception:
                pass
            logging.error("Failed to verify connectivity to Neo4j: %s", e)
            # If the URI used the secure 'neo4j+s' scheme, attempt an insecure 'neo4j+ssc' retry
            if NEO4J_URI.startswith("neo4j+s://"):
                try:
                    alt_uri = NEO4J_URI.replace("neo4j+s://", "neo4j+ssc://", 1)
                    logging.warning("verify_connectivity failed for neo4j+s://, retrying with neo4j+ssc:// (insecure) to help diagnose TLS issues")
                    _driver = GraphDatabase.driver(alt_uri, auth=(NEO4J_USER, NEO4J_PASSWORD))
                    _driver.verify_connectivity()
                    logging.warning("Connected to Neo4j using neo4j+ssc:// (certificate validation disabled). Use this only for testing.")
                    return
                except Exception as e2:
                    try:
                        _driver.close()
                    except Exception:
                        pass
                    logging.error("Retry with neo4j+ssc failed: %s", e2)
            raise RuntimeError(
                "Unable to connect to Neo4j. Check NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD. "
                "If you're using AuraDB, ensure the URI starts with 'neo4j+s://' and the password is the one from the Aura console."
            ) from e
    except Exception:
        # ensure _driver is cleared on error
        _driver = None
        raise


def get_driver():
    if _driver is None:
        init_driver()
    return _driver


def close_driver():
    global _driver
    if _driver:
        try:
            _driver.close()
        finally:
            _driver = None
