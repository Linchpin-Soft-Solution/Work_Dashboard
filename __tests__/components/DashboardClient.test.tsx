import React from 'react'
import { render, screen } from '@testing-library/react'
import DashboardClient from '@/app/dashboard/DashboardClient'

// Mock matchMedia for window (if used by any radix-ui/shadcn component internals)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

const mockStatsAdmin = {
  role: "ADMIN" as const,
  userName: "Admin User",
  adminStats: {
    totalUsers: 10,
    presentToday: 8,
    lateToday: 1,
    absentToday: 1,
    openTargets: 5,
    openInvoices: 2,
  },
  activeTargets: [],
  upcomingEvents: [],
}

const mockStatsEmployee = {
  role: "EMPLOYEE" as const,
  userName: "Employee User",
  employeeStats: {
    attendanceToday: "PRESENT" as const,
    openTargets: 3,
    logSubmittedToday: true,
  },
  activeTargets: [],
  upcomingEvents: [],
}

describe("DashboardClient", () => {
  it("renders admin view correctly", () => {
    render(<DashboardClient stats={mockStatsAdmin} />)
    
    expect(screen.getByText("Welcome back, Admin User")).toBeInTheDocument()
    expect(screen.getByText("Total Active Users")).toBeInTheDocument()
    expect(screen.getByText("10")).toBeInTheDocument()
    expect(screen.getByText("Today's Attendance")).toBeInTheDocument()
    expect(screen.getByText("8")).toBeInTheDocument()
    expect(screen.getByText("Open Targets")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByText("Open Invoices")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("renders employee view correctly", () => {
    render(<DashboardClient stats={mockStatsEmployee} />)
    
    expect(screen.getByText("Welcome back, Employee User")).toBeInTheDocument()
    expect(screen.queryByText("Total Active Users")).not.toBeInTheDocument()
    
    expect(screen.getAllByText("Today's Attendance").length).toBeGreaterThan(0)
    expect(screen.getByText("PRESENT")).toBeInTheDocument()
    expect(screen.getByText("My Open Targets")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("Daily Log")).toBeInTheDocument()
    expect(screen.getByText("Submitted")).toBeInTheDocument()
  })

  it("renders active targets correctly", () => {
    const statsWithTargets = {
      ...mockStatsEmployee,
      activeTargets: [
        { id: "1", title: "Test Critical Target", priority: "HIGH", dueDate: "2026-04-30T00:00:00.000Z" }
      ]
    }
    render(<DashboardClient stats={statsWithTargets} />)
    expect(screen.getByText("Test Critical Target")).toBeInTheDocument()
    expect(screen.getByText("HIGH")).toBeInTheDocument()
  })
})
