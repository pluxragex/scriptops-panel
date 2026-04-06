import React from 'react'
import { Toaster, ToastBar, toast, useToasterStore } from 'react-hot-toast'
import { X, CheckCircle, Info, XCircle } from 'lucide-react'

function ToastWrapper() {
  const { toasts } = useToasterStore()
  const visibleToasts = toasts.filter(t => t.visible)
  const toastCount = visibleToasts.length
  const isStacked = toastCount > 3

  return (
    <Toaster
      position="top-right"
      containerClassName="!top-4 !right-4"
      containerStyle={{
        zIndex: 9999,
      }}
      toastOptions={{
        duration: 5000,
        className: '',
        style: {
          background: 'transparent',
          padding: 0,
          margin: 0,
          boxShadow: 'none',
        },
      }}
    >
      {(t) => {

        const currentIndex = visibleToasts.findIndex(toastItem => toastItem.id === t.id)
        const isInStack = isStacked && currentIndex >= 3
        const stackOffset = isInStack ? (currentIndex - 3) * 6 : 0

        const getToastStyles = () => {
          switch (t.type) {
            case 'success':
              return {
                accentColor: '#10b981',
                iconColor: 'text-green-400',
                iconBg: 'bg-green-500/20',
                iconBorder: 'border-green-500/40',
                iconComponent: <CheckCircle className="h-5 w-5" />,
              }
            case 'error':
              return {
                accentColor: '#ef4444',
                iconColor: 'text-red-400',
                iconBg: 'bg-red-500/20',
                iconBorder: 'border-red-500/40',
                iconComponent: <XCircle className="h-5 w-5" />,
              }
            default:
              return {
                accentColor: '#a476ff',
                iconColor: 'text-[#a476ff]',
                iconBg: 'bg-[#a476ff]/20',
                iconBorder: 'border-[#a476ff]/40',
                iconComponent: <Info className="h-5 w-5" />,
              }
          }
        }

        const styles = getToastStyles()

        return (
          <div
            data-toast-wrapper={t.id}
            className="transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{
              marginBottom: isInStack ? `${-8 - stackOffset}px` : '8px',
              zIndex: isInStack ? 1000 - currentIndex : 1000,
              transform: isInStack ? 'scale(0.92) translateY(-4px)' : 'scale(1) translateY(0)',
              opacity: isInStack ? 0.75 : 1,
            }}
          >
            <ToastBar toast={t}>
              {({ message }) => {

                const getMessageText = () => {
                  if (typeof message === 'string') {
                    return message
                  }
                  if (typeof message === 'object' && message !== null) {
                    if (React.isValidElement(message)) {
                      return message
                    }
                    if ('message' in message && typeof message.message === 'string') {
                      return message.message
                    }
                    if ('error' in message && typeof message.error === 'string') {
                      return message.error
                    }
                    const stringValue = Object.values(message).find(v => typeof v === 'string')
                    if (stringValue) {
                      return stringValue as string
                    }
                  }
                  return String(message)
                }

                const messageContent = getMessageText()
                const isReactElement = React.isValidElement(messageContent)
                const duration = t.duration || 5000

                return (
                  <div
                    className="
                      bg-[#151515]
                      border border-[#ffffff10]
                      rounded-xl
                      p-4
                      min-w-[320px] max-w-[420px]
                      flex items-center gap-4
                      relative overflow-hidden
                      group
                      shadow-xl
                      backdrop-blur-sm
                      transition-all duration-300 ease-out
                      hover:border-[#ffffff20]
                      hover:shadow-2xl
                    "
                    onClick={() => {
                      if (isInStack) {
                        const allToasts = document.querySelectorAll('[data-toast-wrapper]')
                        allToasts.forEach((toastEl: any) => {
                          toastEl.style.transform = 'scale(1) translateY(0)'
                          toastEl.style.opacity = '1'
                        })
                      }
                    }}
                  >
                    <div
                      className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden"
                      style={{
                        padding: '2px',
                      }}
                    >
                      <div
                        className="absolute inset-0 rounded-xl"
                        style={{
                          background: `conic-gradient(from 0deg, transparent, ${styles.accentColor}60, transparent, ${styles.accentColor}60, transparent)`,
                          backgroundSize: '200% 200%',
                          animation: `border-spin ${duration}ms linear infinite`,
                          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                          WebkitMaskComposite: 'xor',
                          maskComposite: 'exclude',
                        }}
                      />
                    </div>

                    <div
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{
                        border: `1px solid ${styles.accentColor}20`,
                      }}
                    />

                    <div className={`
                      ${styles.iconBg} ${styles.iconColor} ${styles.iconBorder}
                      p-2.5 rounded-lg
                      border
                      flex-shrink-0
                      relative z-10
                      shadow-sm
                      flex items-center justify-center
                    `}>
                      {styles.iconComponent}
                    </div>

                    <div className="flex-1 min-w-0 relative z-10 flex items-center">
                      {isReactElement ? (
                        <div className="text-sm font-medium text-[#dfdfdf] leading-relaxed break-words w-full">
                          {messageContent}
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-[#dfdfdf] leading-relaxed break-words w-full">
                          {messageContent}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toast.dismiss(t.id)
                      }}
                      className="
                        flex-shrink-0
                        p-1.5 rounded-lg
                        text-[#f3f3f398] hover:text-[#dfdfdf]
                        hover:bg-[#ffffff10]
                        transition-all duration-200
                        opacity-0 group-hover:opacity-100
                        relative z-10
                        active:scale-90
                      "
                      aria-label="Закрыть уведомление"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    <div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ffffff10] overflow-hidden rounded-b-xl"
                    >
                      <div
                        className="h-full transition-all ease-linear"
                        style={{
                          width: t.visible ? '0%' : '100%',
                          transitionDuration: `${duration}ms`,
                          background: `linear-gradient(to right, ${styles.accentColor}, ${styles.accentColor}80)`,
                        }}
                      />
                    </div>
                  </div>
                )
              }}
            </ToastBar>
          </div>
        )
      }}
    </Toaster>
  )
}

export default function CustomToaster() {
  return (
    <>
      <style>{`
        @keyframes border-spin {
          0% {
            background-position: 0% 0%;
          }
          100% {
            background-position: 200% 200%;
          }
        }
      `}</style>
      <ToastWrapper />
    </>
  )
}
