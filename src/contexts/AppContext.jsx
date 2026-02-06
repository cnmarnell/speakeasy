import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { createUserProfile } from '../data/supabaseData'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [currentStudentId, setCurrentStudentId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await handleLogin(session.user)
      }
      setIsLoading(false)
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setUserRole(null)
        setCurrentStudentId(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async (authUser, role = null) => {
    setUser(authUser)

    if (role) {
      setUserRole(role)
      if (role === 'student') {
        const { data: studentData } = await supabase
          .from('students')
          .select('id')
          .eq('email', authUser.email)
          .single()
        if (studentData) {
          setCurrentStudentId(studentData.id)
        }
      }
      return
    }

    const { data: studentData } = await supabase
      .from('students')
      .select('id')
      .eq('email', authUser.email)
      .single()

    if (studentData) {
      setUserRole('student')
      setCurrentStudentId(studentData.id)
    } else {
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('id')
        .eq('email', authUser.email)
        .single()

      if (teacherData) {
        setUserRole('teacher')
      } else {
        // New user (likely from OAuth) - create student profile
        const userName = authUser.user_metadata?.full_name || authUser.email.split('@')[0]
        try {
          const newStudent = await createUserProfile(authUser.email, userName, 'student')
          setUserRole('student')
          if (newStudent?.id) {
            setCurrentStudentId(newStudent.id)
          }
        } catch (err) {
          console.error('Failed to create profile for new user:', err)
          setUserRole('student')
        }
      }
    }
  }

  const handleLogout = async () => {
    try {
      console.log('Logging out...')
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
        // Force clear state even if signOut API fails
        setUser(null)
        setUserRole(null)
        setCurrentStudentId(null)
      }
    } catch (err) {
      console.error('Logout failed:', err)
      // Force clear state on any error
      setUser(null)
      setUserRole(null)
      setCurrentStudentId(null)
    }
  }

  return (
    <AppContext.Provider value={{
      user,
      userRole,
      currentStudentId,
      isLoading,
      handleLogin,
      handleLogout
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}
