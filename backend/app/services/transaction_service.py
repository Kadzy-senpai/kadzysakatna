from app.db.neo4j_driver import get_driver
from uuid import uuid4
from datetime import datetime

class TransactionService:
    @staticmethod
    def create_transaction(data):
        tx_id = str(uuid4())
        created_at = datetime.utcnow().isoformat()
        mode = data.payment_mode.lower()
        if mode not in ("cash", "online"):
            raise ValueError("payment_mode must be 'cash' or 'online'")
        status = "pending" if mode == "cash" else "success"

        query = """
        MATCH (b:Booking {booking_id:$booking_id}),
              (u:User {user_id:$user_id}),
              (d:User {user_id:$driver_id})
        CREATE (t:Transaction {
            transaction_id:$tx_id,
            booking_id:$booking_id,
            user_id:$user_id,
            driver_id:$driver_id,
            payment_mode:$payment_mode,
            payment_status:$status,
            amount:$amount,
            created_at: datetime($created_at)
        })
        MERGE (u)-[:MADE]->(t)
        MERGE (b)-[:HAS_TRANSACTION]->(t)
        MERGE (d)-[:RECEIVED]->(t)
        RETURN t
        """
        driver = get_driver()
        with driver.session() as session:
            res = session.run(query, {
                "tx_id": tx_id,
                "booking_id": data.booking_id,
                "user_id": data.user_id,
                "driver_id": data.driver_id,
                "payment_mode": data.payment_mode,
                "status": status,
                "amount": data.amount,
                "created_at": created_at
            }).single()
            return dict(res["t"])

    @staticmethod
    def confirm_cash_payment(transaction_id: str):
        driver = get_driver()
        with driver.session() as session:
            res = session.run("""
            MATCH (t:Transaction {transaction_id:$tx_id})
            SET t.payment_status='success'
            RETURN t
            """, tx_id=transaction_id).single()
            if not res:
                raise ValueError("Transaction not found")
            return dict(res["t"])

    @staticmethod
    def get_user_transactions(user_id: str):
        driver = get_driver()
        with driver.session() as session:
            res = session.run("""
            MATCH (u:User {user_id:$user_id})-[:MADE]->(t:Transaction)
            RETURN t ORDER BY t.created_at DESC
            """, user_id=user_id)
            return [dict(r["t"]) for r in res]

    @staticmethod
    def get_driver_transactions(driver_id: str):
        driver = get_driver()
        with driver.session() as session:
            res = session.run("""
            MATCH (d:User {user_id:$driver_id})-[:RECEIVED]->(t:Transaction)
            RETURN t ORDER BY t.created_at DESC
            """, driver_id=driver_id)
            return [dict(r["t"]) for r in res]

    @staticmethod
    def get_daily_total(date_str: str):
        driver = get_driver()
        with driver.session() as session:
            res = session.run("""
            MATCH (t:Transaction)
            WHERE date(t.created_at) = date($date)
            RETURN sum(t.amount) AS total
            """, date=date_str).single()
            return {"date": date_str, "total": res["total"] or 0}
