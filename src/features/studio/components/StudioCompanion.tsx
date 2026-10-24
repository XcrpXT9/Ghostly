import { useEffect, useRef, useState } from 'react'
import { MousePointer2, ArrowUp, RotateCcw, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useStudioLanguage } from '@/i18n'
import { createAvatarDefinition } from '@/features/avatar/avatarDefinition'
import type { StudioAvatar, AvatarBehaviorLibrary } from '@/features/avatar/avatars'
import {
  createCompanion,
  type CompanionController,
  type CompanionState,
} from '../../../../packages/avatar-web/src/index'

export function StudioCompanion({
  avatar,
  expressions,
  sequences,
}: { avatar: StudioAvatar } & AvatarBehaviorLibrary) {
  const { t } = useStudioLanguage()
  const [enabled, setEnabled] = useState(true)
  const [state, setState] = useState<CompanionState>({
    mode: 'following',
    side: null,
    jumping: false,
    dizzy: false,
  })
  const companion = useRef<CompanionController | null>(null)

  useEffect(() => {
    if (!enabled) return
    const instance = createCompanion({ size: 96, onStateChange: setState })
    companion.current = instance
    return () => {
      instance.destroy()
      companion.current = null
    }
  }, [enabled])

  useEffect(() => {
    // Incomplete expression keys during editing should not hide the selected avatar.
    const result = createAvatarDefinition({ avatar, behavior: { expressions, sequences } })
    const fallback = result.ok
      ? result
      : createAvatarDefinition({ avatar, behavior: { expressions: [], sequences: [] } })
    if (fallback.ok) companion.current?.setAvatar(fallback.value)
  }, [avatar, expressions, sequences, enabled])

  const status = !enabled
    ? 'Masqué'
    : state.dizzy
      ? 'Étourdi'
      : state.jumping
        ? 'En saut'
        : state.mode === 'docked'
          ? 'Accroché'
          : 'Suit le curseur'
  return (
    <section className="studio-companion" aria-label={t('Compagnon du site')} data-mascot-ignore>
      <div className="studio-companion-heading">
        <label htmlFor="studio-companion-enabled">
          <MousePointer2 size={15} />
          {t('Compagnon du site')} <strong>{avatar.name}</strong>
        </label>
        <Switch
          id="studio-companion-enabled"
          checked={enabled}
          onCheckedChange={setEnabled}
          aria-label={t('Afficher le compagnon')}
        />
      </div>
      <p>
        {t(
          'Deux cercles pour étourdir, un double-clic pour sauter. Éloignez le curseur pour détacher.'
        )}
      </p>
      <div className="studio-companion-actions">
        <Button
          size="sm"
          variant="outline"
          disabled={!enabled}
          onClick={() => companion.current?.follow()}
        >
          <MousePointer2 />
          {t('Suivre')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!enabled}
          onClick={() => companion.current?.jump()}
        >
          <ArrowUp />
          {t('Sauter')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!enabled}
          onClick={() => companion.current?.dizzy()}
        >
          <RotateCcw />
          {t('Étourdir')}
        </Button>
        <a
          href={`./playground.html?avatar=${encodeURIComponent(avatar.id)}`}
          target="_blank"
          rel="noreferrer"
        >
          {t('Playground')}
          <ExternalLink size={12} />
        </a>
        <span role="status" aria-live="polite">
          {t(status)}
        </span>
      </div>
    </section>
  )
}
