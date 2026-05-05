import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';

//admin is a boolean that determines if this is the page to create a new admin or normal user
function Signup({admin, user}) {
  const [username, setUsername] = useState("")
  const [displayText, setDisplay] = useState("Create Account")
  const [pass, setPass] = useState("")
  const [met, setMet] = useState(true)
  const [message, setMessage] = useState("")


  const navigate = useNavigate();

  useEffect(() => {
    if(user !== null){
      user.type === 1 ? null : navigate("/map"); //should send you to map if your a user and admin controls if your an admin
      user.type === 1 ? setDisplay("Create New Admin") : setDisplay("Create Account")
    }
  }, [user, navigate])

  async function createUser() {
        const url = 'https://cmp404-users-service-frhqgtcghkhde4ee.austriaeast-01.azurewebsites.net/users'
        const data = {
            type: admin ? 1 : 0,
            username: username,
            password: pass
        }

        try {
            const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data), 
            });

            if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}. ${errorBody}`);
            }

            const result = await response.json();
            console.log('Success:', result);
            navigate("/")

        } catch (error) {
            console.error('Error during POST request:', error);
            setMessage("Could not create user. Make sure users service is running.")
        }

    }
  

  const submit = (e) => {

    e.preventDefault()
    setMessage("")

    if(username.trim() !== "" && pass.trim() !== ""){
        setMet(true)
        createUser()
    }
    else{
        setMet(false)
    }
  }



  return (
    <>
      <div className='flex items-center justify-center min-h-screen min-w-screen bg-[#30323D]' style={{width: 500, height: 500}}>
        <form className='flex flex-col items-center justify-center w-150 h-150 bg-[#4D5061] rounded-3xl shadow-xl/20 p-5' onSubmit={submit}>
          <p className='text-5xl font-roboto-mono font-bold text-gray-200 mb-12'>{displayText}</p>
          <p className='self-start text-2xl fotn-roboto-mono font-bold text-gray-100'>Username: </p>
          <input className="bg-[#5C9EAD] rounded-2xl w-full shadow-xl/20 m-3" value={username} onChange={(e) => {
            setUsername(e.target.value)
            console.log(e.target.value)
          }} type="text" style={{height: 50}}></input>
          <p className='self-start text-2xl fotn-roboto-mono font-bold text-gray-100'>Password: </p>
          <input className="bg-[#5C9EAD] rounded-2xl w-full shadow-xl/20 m-3" value={pass} onChange={(e) => {
            setPass(e.target.value)
            console.log(e.target.value)
          }} type="password" style={{height: 50}}></input>
          <button type="submit" className="bg-[#5C9EAD] rounded-2xl w-full shadow-xl/20 text-green-200 font-bold m-5" style={{height: 50}}>SIGNUP</button>
        <p className='text-2xl fotn-roboto-mono font-bold text-gray-100' style={{visibility: met ? 'hidden' : 'visible'}}>Username or Password is empty</p>
        <p className='text-m fotn-roboto-mono font-bold text-red-200 min-h-6'>{message}</p>
        </form>
      </div>
    </>
  )
}

export default Signup
