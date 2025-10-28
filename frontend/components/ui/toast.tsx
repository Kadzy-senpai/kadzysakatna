"use client"

import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

export { toast }

export function Toaster() {
  return (
    <ToastContainer
      position="top-center"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
    />
  )
}
