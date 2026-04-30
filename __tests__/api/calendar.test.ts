/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/calendar/route'
import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    calendarEvent: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    target: {
      findMany: jest.fn(),
    }
  }
}))

describe("Calendar API & DB Interactions", () => {
  const mockAuth = auth as jest.Mock
  const mockPrisma = prisma as jest.Mocked<typeof prisma>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("GET /api/calendar", () => {
    it("returns 401 if unauthorized", async () => {
      mockAuth.mockResolvedValueOnce(null)
      const req = new NextRequest('http://localhost/api/calendar')
      const res = await GET(req)
      expect(res.status).toBe(401)
    })

    it("returns combined events and targets for admin", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "admin-1", role: "ADMIN" } })
      
      // Mock company events
      mockPrisma.calendarEvent.findMany.mockResolvedValueOnce([
        { id: "event-1", startTime: new Date().toISOString(), isCompanyWide: true }
      ] as any)
      
      // Mock user events
      mockPrisma.calendarEvent.findMany.mockResolvedValueOnce([
        { id: "event-2", startTime: new Date().toISOString(), isCompanyWide: false }
      ] as any)
      
      // Mock user targets
      mockPrisma.target.findMany.mockResolvedValueOnce([
        { id: "target-1", title: "Test Target", dueDate: new Date(), priority: "HIGH" }
      ] as any)

      const req = new NextRequest('http://localhost/api/calendar')
      const res = await GET(req)
      
      expect(res.status).toBe(200)
      const json = await res.json()
      
      expect(json.events).toBeDefined()
      // Should have 3 events (1 company, 1 user, 1 target mapped to event)
      expect(json.events.length).toBe(3)
      expect(mockPrisma.calendarEvent.findMany).toHaveBeenCalledTimes(2)
      expect(mockPrisma.target.findMany).toHaveBeenCalledTimes(1)
    })
  })

  describe("POST /api/calendar", () => {
    it("creates an event successfully", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-1", role: "EMPLOYEE" } })
      
      const mockEvent = { id: "new-event", title: "Test Event", isPrivate: true }
      mockPrisma.calendarEvent.create.mockResolvedValueOnce(mockEvent as any)

      const req = new NextRequest('http://localhost/api/calendar', {
        method: 'POST',
        body: JSON.stringify({
          title: "Test Event",
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          isPrivate: true
        })
      })

      const res = await POST(req)
      
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.event.title).toBe("Test Event")
      
      // Verify DB interaction schema
      expect(mockPrisma.calendarEvent.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          title: "Test Event",
          isPrivate: true
        })
      }))
    })

    it("prevents non-admins from creating company-wide events", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-1", role: "EMPLOYEE" } })
      
      const req = new NextRequest('http://localhost/api/calendar', {
        method: 'POST',
        body: JSON.stringify({
          title: "Test Event",
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          isCompanyWide: true
        })
      })

      const res = await POST(req)
      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.error).toMatch(/only admins/i)
      
      expect(mockPrisma.calendarEvent.create).not.toHaveBeenCalled()
    })
  })
})
