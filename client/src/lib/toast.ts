import toast from 'react-hot-toast'


const shownToasts = new Set<string>()


const TOAST_LIFETIME = 5000


export const showErrorToast = (message: string, key?: string) => {

  if (key && shownToasts.has(key)) {
    return
  }


  toast.error(message)


  if (key) {
    shownToasts.add(key)


    setTimeout(() => {
      shownToasts.delete(key)
    }, TOAST_LIFETIME)
  }
}


export const showSuccessToast = (message: string) => {
  toast.success(message)
}


export const showInfoToast = (message: string) => {
  toast(message)
}


export const clearToasts = () => {
  toast.dismiss()
  shownToasts.clear()
}


export const createErrorKey = (url: string, status: number): string => {
  return `${url}:${status}`
}


export const createSessionErrorKey = (): string => {
  return 'session_expired'
}
