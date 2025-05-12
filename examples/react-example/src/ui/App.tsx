import React, { useState, useEffect, useCallback } from 'react'
import { createLink, LinkPayload, TransferFinishedPayload } from '@meshconnect/web-link-sdk'
import { Section, Button, Input, theme } from '../components/StyledComponents'
import * as CryptoJS from 'crypto-js'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate
} from 'react-router-dom'

const RedirectBlock: React.FC = () => {
  const navigate = useNavigate()

  useEffect(() => {
    if (window.location.pathname === '/') {
      navigate('/blocked', { replace: true }) // Redirect from `/` to `/blocked`
    }
  }, [])

  return null
}

export const App: React.FC = () => {
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<LinkPayload | null>(null)
  const [transferFinishedData, setTransferFinishedData] = useState<TransferFinishedPayload | null>(null)
  const [isConfirmationRequired, setIsConfirmationRequired] = useState(false) // Track if we need confirmation

  const searchParams = new URLSearchParams(window.location.search)
  const token = searchParams.get('token')
  const signature = searchParams.get('signature')
  const bank_id = searchParams.get('bankId')
  const purchase_id = searchParams.get('purchaseId')
  const [directLinkToken, setDirectLinkToken] = useState(token)
  const [bankId, setBankId] = useState(bank_id)
  const [sign, setSign] = useState(signature)
  const [purchaseId, setPurchaseId] = useState(purchase_id)
  const SECRET_KEY = 'OVzBmEmVk0iaAnoeqTsDvDrnoMNKCU9b1id2cB4KVX0='
  const [isSignatureValid, setIsSignatureValid] = useState(false)
  const [verificationError, setVerificationError] = useState('')

  const handleDirectTokenLaunch = useCallback(() => {
    if (!directLinkToken) {
      setError('Please enter a link token')
      return
    }

    // Signature verification logic
    const signatureVerify = (clientSecret: string, rawBody: string, receivedSignature: any): boolean => {
      try {
        const hmacDigest = CryptoJS.HmacSHA256(rawBody, clientSecret)
        const generatedSignature = CryptoJS.enc.Base64.stringify(hmacDigest).replaceAll('+', '').replaceAll('/', '')
        if (generatedSignature === receivedSignature) {
          setIsSignatureValid(true)
          setVerificationError('')
          return true
        } else {
          setIsSignatureValid(false)
          setVerificationError('Generated signature and received signature did not match.')
          return false
        }
      } catch (error: unknown) {
        setIsSignatureValid(false)
        setVerificationError(`Error verifying signature: ${error instanceof Error ? error.message : 'Unknown error'}`)
        return false
      }
    }

    const body = token + '##' + bankId + '##' + purchaseId
    if (!signatureVerify(SECRET_KEY, body, sign)) {
      setError('Invalid signature')
      return
    }

    // Handle the rest of the logic...

  }, [directLinkToken, bankId, purchaseId])

  useEffect(() => {
    if (directLinkToken) {
      handleDirectTokenLaunch()
    }
  }, [directLinkToken, handleDirectTokenLaunch])

  // Confirmation on tab close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isConfirmationRequired) {
        const message = "Are you sure you want to leave? You may have unsaved changes."
        e.returnValue = message
        return message // For most browsers, return this string for confirmation
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isConfirmationRequired])

  // Example to trigger confirmation when form data is changed
  const handleFormChange = () => {
    setIsConfirmationRequired(true) // Set flag to show confirmation dialog on tab close/refresh
  }

  return (
    <Router>
      <RedirectBlock />
      <div
        style={{
          padding: theme.spacing.xl,
          maxWidth: '1000px',
          margin: '0 auto',
          backgroundColor: theme.colors.background,
          minHeight: '100vh'
        }}
      >
        <Routes>
          <Route
            path="/blocked"
            element={<h1>Access to this page is restricted.</h1>}
          />
          <Route
            path="/home"
            element={
              <>
                <Section title="Direct Link Token Launch">
                  <Input
                    label="Link Token:"
                    value={directLinkToken}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDirectLinkToken(e.target.value)}
                    placeholder="Enter your link token"
                  />
                  <Button onClick={handleDirectTokenLaunch}>
                    Launch with Link Token
                  </Button>
                </Section>

                {error && (
                  <Section title="Error" style={{ backgroundColor: '#fff3f3' }}>
                    <p style={{ color: theme.colors.error }}>{error}</p>
                  </Section>
                )}

                {payload && (
                  <Section title="Connection Results">
                    <div>
                      {/* Display payload information */}
                    </div>
                  </Section>
                )}

                {transferFinishedData && (
                  <Section title="Transfer Results">
                    <div>
                      {/* Display transfer results */}
                    </div>
                  </Section>
                )}
              </>
            }
          />
          <Route path="*" element={<Navigate to="/blocked" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
