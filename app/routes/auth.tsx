import React from 'react'
import { usePuterStore } from '~/lib/puter';
import { useEffect } from 'react';
import { useLocation, useNavigate ,Link} from 'react-router';
import Navbar from '~/components/Navbar';
export const meta =()=>([
    {title:"Resumemind|auth"},
    {name:"description", content:"Log into your account"}
])

const auth = () => {
    const {isLoading,auth}=usePuterStore();
    const location=useLocation();
    const next=location.search.split('next=')[1];
    const navigate=useNavigate()

    useEffect(()=>{
        if(auth.isAuthenticated)navigate(next); 
    },
    [auth.isAuthenticated,next])
  return (
      <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen flex items-center justify-center">
     <div className='gradient-border shadow-lg'>
        <nav className="resume-nav flex items-center justify-between">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
                    <span className="text-gray-800 text-sm font-semibold">Back to Homepage</span>
                </Link>
                  <Link to="/upload" className='primary-button w-fit'>
                      Upload Resume
                      </Link>
            </nav>
      <section className="flex flex-col gap-8 bg-white rounded-2xl p-10">
        <div className='flex flex-col gap-2 text-center'>
            <h1>
                Welcome
            </h1>
            <h2>
                Log In to continue Your Job Journey
            </h2>
        </div>
        <div>
            {isLoading ?(
                <button className='auth-button animate-pulse'>
                    <p>Signing you in...</p>
                </button>
            ):(
                <>
                {auth.isAuthenticated ?(
                    <button className='auth-button' onClick={auth.signOut}>
                        <p>Log Out</p>
                    </button>
                ):(
                    <button className='auth-button' onClick={auth.signIn}>
                      <p>
                        Log in
                        </p>
                    </button>
                )}
                </>
            )}
        </div>
      </section>
     </div>
    </main>
  )
}

export default auth
