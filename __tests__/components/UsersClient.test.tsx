import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import UsersClient from '@/app/dashboard/users/UsersClient'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    refresh: jest.fn(),
  })),
}))

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock fetch
global.fetch = jest.fn()

const mockUsers = [
  {
    id: "1",
    name: "John Doe",
    email: "john@linchpinsoftsolution.com",
    role: "ADMIN",
    isActive: true,
    baseMonthlySalary: 50000,
    designation: "Manager",
    createdAt: new Date(),
    updatedAt: new Date(),
    emailVerified: null,
    image: null,
    password: "hashed-password",
  },
]

describe("UsersClient Component", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  it("renders the user list correctly", () => {
    render(<UsersClient initialUsers={mockUsers} currentUserId="admin-1" />)
    
    expect(screen.getByText("John Doe")).toBeInTheDocument()
    expect(screen.getByText("john@linchpinsoftsolution.com")).toBeInTheDocument()
    expect(screen.getByText("ADMIN")).toBeInTheDocument()
    expect(screen.getByText("Active")).toBeInTheDocument()
  })

  it("opens the add user dialog", () => {
    render(<UsersClient initialUsers={mockUsers} currentUserId="admin-1" />)
    
    const addButton = screen.getByText("Add User")
    fireEvent.click(addButton)
    
    expect(screen.getByText("Add New User")).toBeInTheDocument()
    expect(screen.getByLabelText("Full Name")).toBeInTheDocument()
  })

  it("successfully creates a new user", async () => {
    const newUser = { ...mockUsers[0], id: "2", name: "Jane Smith", email: "jane@linchpinsoftsolution.com" }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => newUser,
    })

    render(<UsersClient initialUsers={mockUsers} currentUserId="admin-1" />)
    
    // Open modal
    fireEvent.click(screen.getByText("Add User"))
    
    // Fill form
    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "Jane Smith" } })
    fireEvent.change(screen.getByLabelText("Email Address"), { target: { value: "jane@linchpinsoftsolution.com" } })
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } })
    
    // Submit
    fireEvent.click(screen.getByText("Create User"))
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/users", expect.objectContaining({
        method: "POST",
      }))
      expect(toast.success).toHaveBeenCalledWith("User created successfully")
    })
  })

  it("shows error toast when user creation fails", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Email already exists" }),
    })

    render(<UsersClient initialUsers={mockUsers} currentUserId="admin-1" />)
    
    fireEvent.click(screen.getByText("Add User"))
    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "Jane Smith" } })
    fireEvent.change(screen.getByLabelText("Email Address"), { target: { value: "jane@linchpinsoftsolution.com" } })
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } })
    
    fireEvent.click(screen.getByText("Create User"))
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
      expect(toast.error).toHaveBeenCalled()
    })
    
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Email already exists"))
  })
})
