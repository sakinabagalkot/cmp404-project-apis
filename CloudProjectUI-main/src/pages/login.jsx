import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';


function Login({user, userHook}) {
  const [username, setUsername] = useState("")
  const [pass, setPass] = useState("")
  const [message, setMessage] = useState("")


  const navigate = useNavigate();

  useEffect(() => {

    if(user !== null){
      user.type === 1 ? navigate("/admin") : navigate("/map"); //should send you to map if your a user and admin controls if your an admin
    }
  }, [user, navigate])

  const submit = async (e) => {

    e.preventDefault()
    setMessage("")

    if (username.trim() === "" || pass.trim() === "") {
      setMessage("Please enter both username and password.")
      return
    }

    try {
      const response = await fetch('https://cmp404-users-service-frhqgtcghkhde4ee.austriaeast-01.azurewebsites.net/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password: pass,
        }),
      })

      if (!response.ok) {
        setMessage("Invalid username or password.")
        return
      }

      const result = await response.json()

      if (result.authenticated) {
        console.log("log in successful")
        userHook({
          id: result.userId,
          username: result.username,
          type: result.type,
        })
      }
      else {
        setMessage(result.message || "Invalid username or password.")
      }
    } catch (error) {
      console.log("an error occurred while logging in", error)
      setMessage("Could not connect to users service. Make sure it is running.")
    }
  }

  const signUp = () => {
    navigate("/signup")
  }


  return (
    <>
      <div className='flex items-center justify-center min-h-screen min-w-screen bg-[#30323D]'>
        <form className='flex flex-col items-center justify-center w-150 h-150 bg-[#4D5061] rounded-3xl shadow-xl/20 p-5' onSubmit={submit}>
          <p className='text-5xl font-roboto-mono font-bold text-gray-200 mb-12'>Login</p>
          <p className='self-start text-2xl fotn-roboto-mono font-bold text-gray-100'>Username: </p>
          <input className="bg-[#5C9EAD] rounded-2xl w-full shadow-xl/20 m-3" value={username} onChange={(e) => {
            setUsername(e.target.value)
            console.log(e.target.value)
          }} type="text" style={{ height: 70}}></input>
          <p className='self-start text-2xl fotn-roboto-mono font-bold text-gray-100'>Password: </p>
          <input className="bg-[#5C9EAD] rounded-2xl w-full shadow-xl/20 m-3" value={pass} onChange={(e) => {
            setPass(e.target.value)
            console.log(e.target.value)
          }} type="password" style={{ height: 70}}></input>
          <button type='submit' className="bg-[#5C9EAD] rounded-2xl w-full shadow-xl/20 text-green-200 font-bold m-5" style={{height: 50}}>LOGIN</button>
          <p className='text-m fotn-roboto-mono font-bold text-red-200 min-h-6'>{message}</p>
          <p className='self-start text-m fotn-roboto-mono font-bold text-gray-100'>if you do not have an account <button type="button" className="font-bold text-green-200 cursor-pointer" onClick={signUp}>&gt;&gt;signup</button> </p>
        </form>
      </div>
    </>
  )
}

export default Login
