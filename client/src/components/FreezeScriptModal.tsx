import { useState } from 'react'
import { X, Snowflake, AlertTriangle, Server } from 'lucide-react'
import { scriptsApi } from '../services/api'
import { Script } from '../types'
import { showSuccessToast } from '../lib/toast'
import { useTranslation } from '../lib/i18n'

interface FreezeScriptModalProps {
  script: Script
  onClose: () => void
  onSuccess: () => void
  isAdmin: boolean
  canFreeze: boolean
  isFrozen: boolean
}

export default function FreezeScriptModal({
  script,
  onClose,
  onSuccess,
  isAdmin,
  canFreeze,
  isFrozen
}: FreezeScriptModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const { t } = useTranslation()

  const handleFreeze = async () => {
    try {
      setIsProcessing(true)
      await scriptsApi.freezeScript(script.id)
      showSuccessToast(t('freeze.success.frozen'))
      onSuccess()
      onClose()
    } catch (error: any) {

      console.error('Ошибка заморозки скрипта:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUnfreeze = async () => {
    try {
      setIsProcessing(true)
      await scriptsApi.unfreezeScript(script.id)
      showSuccessToast(t('freeze.success.unfrozen'))
      onSuccess()
      onClose()
    } catch (error: any) {

      console.error('Ошибка разморозки скрипта:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 max-h-[90vh] shadow-lg rounded-md bg-[#151515] border-[#ffffff10] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Server className="h-5 w-5 text-[#a476ff]" />
            <div>
              <h3 className="text-lg font-medium text-[#dfdfdf]">
                {isFrozen ? t('freeze.unfreeze.title') : t('freeze.title')}
              </h3>
              <p className="text-sm text-[#f3f3f398]">
                {t('freeze.settings.for')}: {script.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#f3f3f398] hover:text-[#dfdfdf] transition-colors"
            disabled={isProcessing}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {isFrozen ? (
            <>
              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Snowflake className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-200">
                    <p className="font-medium mb-1">{t('freeze.unfreeze.info.title')}</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-200/90">
                      <li>{t('freeze.unfreeze.info.1')}</li>
                      <li>{t('freeze.unfreeze.info.2')}</li>
                      <li>{t('freeze.unfreeze.info.3')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-200">
                    <p className="font-medium mb-2">{t('freeze.warning.title')}</p>
                    <ul className="list-disc list-inside space-y-1 text-yellow-200/90">
                      <li>{t('freeze.warning.1')}</li>
                      <li>{t('freeze.warning.2')}</li>
                      <li>{t('freeze.warning.3')}</li>
                      {!isAdmin && (
                        <li className="font-semibold text-yellow-300">{t('freeze.warning.4')}</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Snowflake className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-200">
                    <p className="font-medium mb-1">{t('freeze.info.title')}</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-200/90">
                      <li>{t('freeze.info.1')}</li>
                      <li>{t('freeze.info.2')}</li>
                      <li>{t('freeze.info.3')}</li>
                      <li>{t('freeze.info.4')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#ffffff10]">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-[#dfdfdf] bg-[#1a1a1a] border border-[#ffffff10] rounded-lg hover:bg-[#252525] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.cancel')}
            </button>
            {isFrozen ? (
              <button
                onClick={handleUnfreeze}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('freeze.button.unfreezing')}</span>
                  </>
                ) : (
                  <>
                    <Snowflake className="h-4 w-4" />
                    <span>{t('freeze.button.unfreeze')}</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleFreeze}
                disabled={isProcessing || !canFreeze}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('freeze.button.freezing')}</span>
                  </>
                ) : (
                  <>
                    <Snowflake className="h-4 w-4" />
                    <span>{t('freeze.button.freeze')}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

