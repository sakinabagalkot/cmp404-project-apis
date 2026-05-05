import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const COMPLAINTS_API = 'https://cmp404-complaints-service-c2e9f0e2dzcbdpg4.austriaeast-01.azurewebsites.net/complaints'
const PUBLIC_SERVICES_API = 'https://cmp404-public-service-g5guhradbtf7g7fj.austriaeast-01.azurewebsites.net/publicService'

const serviceTypes = [
  'Wheelchair ramp',
  'Elevator',
  'Accessible entrance',
  'Accessible pathway',
  'Accessible parking',
  'Priority seating',
  'Blind path',
]

const Admin = ({ user, userHook }) => {
  const [complaints, setComplaints] = useState([])
  const [selectedComplaintId, setSelectedComplaintId] = useState('')
  const [services, setServices] = useState([])
  const [type, setType] = useState(serviceTypes[0])
  const [x, setX] = useState('')
  const [y, setY] = useState('')
  const [message, setMessage] = useState('')

  const navigate = useNavigate()

  const selectedComplaint = useMemo(() => {
    return complaints.find((complaint) => String(complaint.id) === selectedComplaintId)
  }, [complaints, selectedComplaintId])

  const fetchComplaintData = async () => {
    try {
      const response = await fetch(COMPLAINTS_API)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setComplaints(result)
      setSelectedComplaintId((currentId) => currentId || (result[0] ? String(result[0].id) : ''))
    } catch (error) {
      console.log('An error occurred while fetching complaints', error)
      setMessage('Could not load complaints. Make sure complaints-service is running on port 8081.')
    }
  }

  const fetchServiceData = async () => {
    try {
      const response = await fetch(PUBLIC_SERVICES_API)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setServices(result)
    } catch (error) {
      console.log('An error occurred while fetching services', error)
      setMessage('Could not load services. Make sure servceapi is running on port 8082.')
    }
  }

  useEffect(() => {
    if (user !== null && user.type !== 1) {
      navigate('/map')
      return
    }

    fetchComplaintData()
    fetchServiceData()
  }, [user, navigate])

  const signout = () => {
    userHook(null)
    navigate('/')
  }

  const redirect = () => {
    navigate('/signup')
  }

  async function approveComplaint(complaint) {
    const data = {
      id: complaint.id,
      xCoord: complaint.xCoord,
      yCoord: complaint.yCoord,
      description: complaint.description,
      approved: true,
    }

    try {
      const response = await fetch(COMPLAINTS_API, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await response.json()
      setComplaints((currentComplaints) =>
        currentComplaints.map((item) => (item.id === complaint.id ? { ...item, approved: true } : item)),
      )
      setMessage('Complaint approved.')
    } catch (error) {
      console.error('Error during complaint approval request:', error)
      setMessage('Could not approve complaint.')
    }
  }

  async function createService(e) {
    e.preventDefault()
    setMessage('')

    if (x === '' || y === '') {
      setMessage('Please enter both coordinates before creating a service.')
      return
    }

    const data = {
      xCoord: Number(x),
      yCoord: Number(y),
      type,
    }

    try {
      const response = await fetch(PUBLIC_SERVICES_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setServices((currentServices) => [...currentServices, result])
      setX('')
      setY('')
      setMessage('Service created.')
    } catch (error) {
      console.error('Error during service POST request:', error)
      setMessage('Could not create service.')
    }
  }

  async function deleteService(id) {
    try {
      const response = await fetch(`${PUBLIC_SERVICES_API}/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setServices((currentServices) => currentServices.filter((service) => service.id !== id))
      setMessage('Service deleted.')
    } catch (error) {
      console.error('Error during service DELETE request:', error)
      setMessage('Could not delete service.')
    }
  }

  return (
    <div className="min-h-screen w-screen bg-[#30323D] p-6 text-gray-100">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-4xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-3">
          <button className="rounded-xl bg-[#5C9EAD] px-4 py-2 font-bold text-green-100" onClick={redirect}>
            Create New Admin
          </button>
          <button className="rounded-xl bg-[#4D5061] px-4 py-2 font-bold text-gray-100" onClick={signout}>
            Sign out
          </button>
        </div>
      </div>

      {message && <p className="mb-4 rounded-xl bg-[#4D5061] p-3 font-bold text-green-100">{message}</p>}

      <section className="mb-8">
        <h2 className="mb-3 text-2xl font-bold">Complaints</h2>
        <div className="rounded-2xl bg-[#4D5061] p-5 shadow-xl/20">
          {complaints.length === 0 ? (
            <p>No complaints found.</p>
          ) : (
            <>
              <select
                className="mb-4 w-full rounded-xl bg-[#5C9EAD] p-3 font-bold text-gray-900"
                value={selectedComplaintId}
                onChange={(e) => setSelectedComplaintId(e.target.value)}
              >
                {complaints.map((complaint) => (
                  <option key={complaint.id} value={complaint.id}>
                    #{complaint.id} - {complaint.description} ({complaint.approved ? 'Approved' : 'Pending'})
                  </option>
                ))}
              </select>

              {selectedComplaint && (
                <div className="grid gap-3 text-lg">
                  <p>Description: {selectedComplaint.description}</p>
                  <p>X coordinate: {selectedComplaint.xCoord}</p>
                  <p>Y coordinate: {selectedComplaint.yCoord}</p>
                  <p>Status: {selectedComplaint.approved ? 'Approved' : 'Pending review'}</p>
                  {!selectedComplaint.approved && (
                    <button
                      className="w-fit rounded-xl bg-[#5C9EAD] px-5 py-2 font-bold text-green-100"
                      onClick={() => approveComplaint(selectedComplaint)}
                    >
                      Approve Complaint
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-2xl font-bold">Services</h2>
        <div className="rounded-2xl bg-[#4D5061] p-5 shadow-xl/20">
          {services.length === 0 ? (
            <p>No services found yet.</p>
          ) : (
            <ul className="grid gap-3">
              {services.map((service) => (
                <li key={service.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#30323D] p-4">
                  <div>
                    <p className="font-bold">{service.type}</p>
                    <p>
                      X: {service.xCoord ?? service.x} | Y: {service.yCoord ?? service.y}
                    </p>
                  </div>
                  <button
                    className="rounded-xl bg-[#5C9EAD] px-4 py-2 font-bold text-green-100"
                    onClick={() => deleteService(service.id)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <form className="max-w-3xl rounded-2xl bg-[#4D5061] p-6 shadow-xl/20" onSubmit={createService}>
        <h2 className="mb-6 text-4xl font-bold">Create New Service</h2>

        <label className="mb-2 block text-xl font-bold" htmlFor="serviceType">
          Service type
        </label>
        <select
          id="serviceType"
          className="mb-5 w-full rounded-xl bg-[#5C9EAD] p-4 font-bold text-gray-900"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {serviceTypes.map((serviceType) => (
            <option key={serviceType} value={serviceType}>
              {serviceType}
            </option>
          ))}
        </select>

        <label className="mb-2 block text-xl font-bold" htmlFor="xCoord">
          X coordinate
        </label>
        <input
          id="xCoord"
          className="mb-5 w-full rounded-xl bg-[#5C9EAD] p-4 font-bold text-gray-900"
          value={x}
          onChange={(e) => setX(e.target.value)}
          type="number"
          step="any"
        />

        <label className="mb-2 block text-xl font-bold" htmlFor="yCoord">
          Y coordinate
        </label>
        <input
          id="yCoord"
          className="mb-5 w-full rounded-xl bg-[#5C9EAD] p-4 font-bold text-gray-900"
          value={y}
          onChange={(e) => setY(e.target.value)}
          type="number"
          step="any"
        />

        <button className="w-full rounded-xl bg-[#5C9EAD] p-4 font-bold text-green-100" type="submit">
          Create Service
        </button>
      </form>
    </div>
  )
}

export default Admin
