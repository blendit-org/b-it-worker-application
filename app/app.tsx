// import WelcomeKit from '@/app/components/welcome/WelcomeKit'
import Home from '@/app/components/homepage/Home'
import React, { useEffect } from 'react'
import LoginForm from './components/loginpage/LoginForm';
import { HttpResponseStatus } from '@/lib/utils';

export default function App() {

  const [accessHome, setAccessHome] = React.useState<boolean | null>(null)

  const handleLoginSuccess = (httpCode: HttpResponseStatus) => {
    if (httpCode == HttpResponseStatus.OK) {
      // replace with swtich maybe
      console.warn('handleLoginSuccess: 200')
      setAccessHome(true);
    } else {
      // TODO: prompt login failed. Email or Password does not match
    }
  }

  useEffect(()=>{
    const validateToken = () => {
      window.api.invoke('auth:is-token-expired')
        .then((flag: boolean) => {
          setAccessHome(flag);
      })
    };

    // run on mount
    validateToken();

    window.api.receive("worker:start-render", validateToken);

    return () => {
      window.api.removeAllListeners("worker:start-render");
    }
  },[])

  if (accessHome === false) {
    return (
      <div className="home-page flex flex-col items-center justify-center gap-8 p-8 min-h-screen bg-background">
        <LoginForm onLoginSuccess={handleLoginSuccess}/>
      </div>
    )
  }

  return <Home />
}
