import React, { useState, useCallback, useEffect } from 'react'
import {
  createLink,
  LinkPayload,
  TransferFinishedPayload
} from '@meshconnect/web-link-sdk'
import { Section, Button, Input, theme } from '../components/StyledComponents'
import axios from 'axios'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate
} from 'react-router-dom'
import * as CryptoJS from 'crypto-js'
// or for specific components
//import { SHA256, HmacSHA256 } from 'crypto-js'

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
  const [transferFinishedData, setTransferFinishedData] =
    useState<TransferFinishedPayload | null>(null)

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
    const decodeBase64 = (encoded: string): string => {
      encoded = encoded.replace(/-/g, '+').replace(/_/g, '/')

      // Add padding if necessary
      while (encoded.length % 4 !== 0) {
        encoded += '='
      }

      const decoded = atob(encoded) // Decode Base64
      return decoded
    }
    const signatureVerify = (
      clientSecret: string,
      rawBody: string,
      receivedSignature: any
    ): boolean => {
      try {
        // eslint-disable-next-line no-debugger
        //  debugger
        //console.log(' in function', receivedSignature)
        // Generate HMAC-SHA256 signature
        // eslint-disable-next-line no-debugger
        //debugger
        // clientSecret = clientSecret.replaceAll('+', '').replaceAll('/', '')
        const hmacDigest = CryptoJS.HmacSHA256(rawBody, clientSecret)
        console.log('hmacDigest', hmacDigest)
        // Convert to Base64

        const generatedSignature = CryptoJS.enc.Base64.stringify(hmacDigest)
          .replaceAll('+', '')
          .replaceAll('/', '')

        console.log('enter in function', generatedSignature)
        // Compare signatures
        if (generatedSignature === receivedSignature) {
          setIsSignatureValid(true)
          setVerificationError('')
          return true
        } else {
          setIsSignatureValid(false)
          console.log('not matched')
          setVerificationError(
            'Generated signature and received signature did not match.'
          )
          return false
        }
      } catch (error: unknown) {
        setIsSignatureValid(false)
        // Properly handle the unknown error type
        if (error instanceof Error) {
          setVerificationError(`Error verifying signature: ${error.message}`)
        } else {
          setVerificationError(`Error verifying signature:`)
        }
        return false
      }
    }
    const body = token + '##' + bankId + '##' + purchaseId
    if (!signatureVerify(SECRET_KEY, body, sign)) {
      setError('Please enter a link token')
      return
    }

    setPayload(null)
    setTransferFinishedData(null)
    setError(null)

    const baseUrl = 'https://test4.paymentsclub.net/custRedirect'

    const meshLink = createLink({
      clientId: directLinkToken,
      onIntegrationConnected: async payload => {
        // eslint-disable-next-line no-debugger
        // debugger
        setPayload(payload)
        console.info('[MESH CONNECTED]', payload)

        const form = document.createElement('form')
        form.method = 'POST'

        const payloadCopy = JSON.parse(JSON.stringify(payload))

        const signPayload = bankId + '##' + purchaseId
        const hmacDigestSuccess = CryptoJS.HmacSHA256(signPayload, SECRET_KEY)
        console.log('hmacDigest', hmacDigestSuccess)
        // Convert to Base64
        const generatedSignatureSuccess =
          CryptoJS.enc.Base64.stringify(hmacDigestSuccess)
        payloadCopy.stat = generatedSignatureSuccess
        console.log('enter in function', generatedSignatureSuccess)
        const url = `${baseUrl}/${bankId}/${purchaseId}`
        form.action = url
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = 'mesh_connected'
        input.value = JSON.stringify(payloadCopy)

        form.appendChild(input)
        document.body.appendChild(form)
        form.submit()
      },
      onExit: (error, summary) => {
       let payload = "";
        if(error)
          payload = '{"error":"' + error + '"}'
        if(summary)
          payload = '{"error":"' + summary + '"}'
          const encodedStr = encodeURIComponent(payload);
          const finalStr = `${encodedStr}`;
          const form = document.createElement('form')
          form.method = 'POST'
          const hmacDigestSuccess = CryptoJS.HmacSHA256(finalStr, SECRET_KEY)
          console.log('hmacDigest', hmacDigestSuccess)
          // Convert to Base64
          const generatedSignatureSuccess =
            CryptoJS.enc.Base64.stringify(hmacDigestSuccess)
          form.action = `${baseUrl}/${bankId}/${purchaseId}?status=${generatedSignatureSuccess}`
          const input = document.createElement('input')
          input.type = 'hidden'
          input.name = 'mesh_connected'
          input.value = finalStr
          form.appendChild(input)
          document.body.appendChild(form)
          form.submit()
          console.error(`[MESH ERROR] ${error}`)
       
        
        
      },
      onTransferFinished: transferData => {
        console.info('[MESH TRANSFER FINISHED]', transferData)
        setTransferFinishedData(transferData)
      },
      onEvent: ev => {
        console.info('[MESH Event::]', ev)
        if (ev.type === 'transferExecuted' && ev.payload) {
          setTransferFinishedData(ev.payload as TransferFinishedPayload)
        }
      }
    })

    meshLink.openLink(directLinkToken)
  }, [directLinkToken, bankId, purchaseId])

  useEffect(() => {
    if (directLinkToken) {
      handleDirectTokenLaunch()
    }
  }, [directLinkToken, handleDirectTokenLaunch])

  if (token) {
    return null
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDirectLinkToken(e.target.value)
                    }
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
                      <p>
                        <strong>Broker:</strong>{' '}
                        {payload.accessToken?.brokerName}
                      </p>
                      <p>
                        <strong>Broker Type:</strong>{' '}
                        {payload.accessToken?.brokerType}
                      </p>
                      <p>
                        <strong>Account Name:</strong>{' '}
                        {payload.accessToken?.accountTokens?.[0]?.account
                          ?.accountName ?? 'N/A'}
                      </p>
                      <p>
                        <strong>Account ID:</strong>{' '}
                        {payload.accessToken?.accountTokens?.[0]?.account
                          ?.accountId ?? 'N/A'}
                      </p>
                      <p>
                        <strong>Cash:</strong> $
                        {payload.accessToken?.accountTokens?.[0]?.account
                          ?.cash ?? 0}
                      </p>
                      <p>
                        <strong>Fund:</strong> $
                        {payload.accessToken?.accountTokens?.[0]?.account
                          ?.fund ?? 0}
                      </p>
                      <p>
                        <strong>Access Token:</strong>{' '}
                        {payload.accessToken?.accountTokens?.[0]?.accessToken ??
                          'N/A'}
                      </p>
                      <p>
                        <strong>Refresh Token:</strong>{' '}
                        {payload.accessToken?.accountTokens?.[0]
                          ?.refreshToken ?? 'N/A'}
                      </p>
                    </div>
                  </Section>
                )}

                {transferFinishedData && (
                  <Section title="Transfer Results">
                    <div>
                      <p>
                        <strong>Status:</strong> {transferFinishedData.status}
                      </p>
                      <p>
                        <strong>Amount:</strong> {transferFinishedData.amount}{' '}
                        {transferFinishedData.symbol}
                      </p>
                      <p>
                        <strong>Symbol:</strong> {transferFinishedData.symbol}
                      </p>
                      <p>
                        <strong>Network ID:</strong>{' '}
                        {transferFinishedData.networkId}
                      </p>
                      <p>
                        <strong>To Address:</strong>{' '}
                        {transferFinishedData.toAddress}
                      </p>
                      <p>
                        <strong>Transaction ID:</strong>{' '}
                        {transferFinishedData.txId}
                      </p>
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
