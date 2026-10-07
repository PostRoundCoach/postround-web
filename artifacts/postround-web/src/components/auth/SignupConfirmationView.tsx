import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { POST_ROUND_APP_URL } from '@/lib/referrals/config'

export type SignupConfirmationStatus =
  | 'applied'
  | 'pending'
  | 'invalid'
  | 'absent'
  | 'unavailable'

export interface SignupConfirmationViewProps {
  status: SignupConfirmationStatus
  storeUrl: string | null
  busy: boolean
  canRetry: boolean
  onRetry: () => void
}

const COPY: Record<SignupConfirmationStatus, string> = {
  applied:
    'Your creator referral has been applied. Your original attribution cannot be replaced.',
  pending:
    'We have not confirmed your creator referral yet. Your account is ready in the meantime.',
  unavailable:
    'We could not confirm your creator referral right now. Your account is ready in the meantime.',
  invalid:
    'No creator referral was confirmed for this signup. Your account is ready.',
  absent:
    'No creator referral was confirmed for this signup. Your account is ready.',
}

const linkButton =
  'inline-flex h-12 w-full items-center justify-center rounded-lg px-8 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export function SignupConfirmationView({
  status,
  storeUrl,
  busy,
  canRetry,
  onRetry,
}: SignupConfirmationViewProps) {
  const unconfirmed = status === 'pending' || status === 'unavailable'

  return (
    <div className="p-6 sm:p-8 space-y-6" data-testid="view-signup-confirmation">
      <div className="text-center space-y-2">
        <h2 className="font-serif text-2xl font-bold text-foreground">
          Welcome to Post Round
        </h2>
        <p className="text-sm font-medium text-foreground">Your account is ready.</p>
        <p
          className="text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
          data-testid={`status-referral-${status}`}
        >
          {COPY[status]}
        </p>
        {unconfirmed && canRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={busy}
            data-testid="button-retry-referral"
          >
            {busy ? 'Checking...' : 'Check again'}
          </Button>
        )}
        {unconfirmed && !canRetry && (
          <p className="mt-3 text-xs text-muted-foreground">
            You can continue on web now, or refresh this page to check again later.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <a
          href={POST_ROUND_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`${linkButton} bg-[#D4AF37] text-[#0D1B12] hover:bg-[#C19F27]`}
          data-testid="link-open-app"
        >
          Open Post Round
        </a>
        <p className="text-xs text-muted-foreground">
          The app may not open on this device. This page stays available either
          way. Opening it does not sign you in. Sign into the app with your email
          and the password you chose during signup, then follow its normal verification step.
        </p>

        {storeUrl ? (
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${linkButton} border border-input bg-background hover:bg-accent hover:text-accent-foreground`}
            data-testid="link-download-app"
          >
            Download Post Round
          </a>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              disabled
              data-testid="button-download-app-disabled"
            >
              Download Post Round
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Google Play listing coming soon.
            </p>
          </>
        )}

        <Link
          href="/dashboard"
          className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors pt-2"
          data-testid="link-continue-web"
        >
          Continue on web
        </Link>
      </div>
    </div>
  )
}

export default SignupConfirmationView
