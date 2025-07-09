
'use client'
import { signIn, signOut, useSession } from 'next-auth/react';

export default function Home() {

  const session = useSession();

  return (
    <div>
      {session?.data?.user ? (
        <div>
          <h1>Hello {session.data.user.name}!</h1>
          <button onClick={()=>signOut()}>Signout</button>
        </div>
      ):<button onClick={()=>signIn()}>Signin</button>}
    </div>
  )
}
