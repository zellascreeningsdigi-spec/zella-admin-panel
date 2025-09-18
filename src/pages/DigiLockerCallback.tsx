import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface CallbackState {
  status: 'loading' | 'success' | 'error';
  message: string;
  sessionId?: string;
  code?: string;
  state?: string;
  error?: string;
}

const DigiLockerCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [callbackState, setCallbackState] = useState<CallbackState>({
    status: 'loading',
    message: 'Processing DigiLocker authorization...'
  });

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams.get('code');
        console.log(code);
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const error_description = searchParams.get('error_description');

        if (error) {
          setCallbackState({
            status: 'error',
            message: `Authorization failed`,
            error: `Failed Contact us via email start@zellascreenings.com`,
          });
          return;
        }

        if (!code || !state) {
          setCallbackState({
            status: 'error',
            message: 'Invalid URL',
            error: `Please try again with same authorization link sent by mail.`,
          });
          return;
        }

        setCallbackState({
          status: 'loading',
          message: 'Communicating with digilocker...'
        });

        // Call backend to exchange code for token
        const response = await fetch(`${process.env.REACT_APP_API_URL}/digilocker/exchange-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, state })
        });

        const result = await response.json();

        if (result.success) {
          setCallbackState({
            status: 'success',
            message: 'Authorization successful! Fetching your documents...',
            sessionId: state,
            code,
            state
          });

          // Fetch documents after successful token exchange
          setTimeout(async () => {
            try {
              const documentsResponse = await fetch(
                `${process.env.REACT_APP_API_URL}/digilocker/session/${state}/documents`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  }
                }
              );

              const documentsResult = await documentsResponse.json();

              if (documentsResult.success) {
                setCallbackState({
                  status: 'success',
                  message: `Success! ${documentsResult.data.documentsCount} documents have been fetched and stored.`,
                  sessionId: state
                });
              } else {
                setCallbackState({
                  status: 'error',
                  message: 'Failed to fetch documents'
                });
              }
            } catch (docError) {
              setCallbackState({
                status: 'error',
                message: 'Error fetching documents: Contact us via email start@zellascreenings.com'
              });
            }
          }, 2000);

        } else {
          setCallbackState({
            status: 'error',
            message: 'Link Expired Contact us for new Link via email start@zellascreenings.com'
          });
        }

      } catch (error) {
        setCallbackState({
          status: 'error',
          message: 'Network error'
        });
      }
    };

    processCallback();
  }, [searchParams]);

  const getStatusIcon = () => {
    switch (callbackState.status) {
      case 'loading':
        return '⏳';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getStatusColor = () => {
    switch (callbackState.status) {
      case 'loading':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <span className="text-2xl">{getStatusIcon()}</span>
            DigiLocker Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className={`text-lg font-medium ${getStatusColor()}`}>
            {callbackState.message}
          </p>

          {callbackState.status === 'loading' && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DigiLockerCallback;