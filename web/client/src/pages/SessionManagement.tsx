import { useTranslation } from 'react-i18next'
import { SessionManagement as SessionManagementComponent } from '@/components/proxy'

export function SessionManagement() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dbe2fd] p-6 space-y-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>
      <div>
        <h2 className="text-3xl font-light tracking-tight text-white font-headline">{t('session.title')}</h2>
        <p className="text-sm text-[#bcc9cd]">{t('session.description')}</p>
      </div>

      <SessionManagementComponent />
    </div>
  )
}

export default SessionManagement
