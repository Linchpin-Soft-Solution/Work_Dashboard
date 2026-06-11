/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/pay-records/route'
import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    payRecord: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    attendance: {
      findMany: jest.fn(),
    }
  }
}))

describe("Pay Records API", () => {
  const mockAuth = auth as jest.Mock
  const mockPrisma = prisma as jest.Mocked<typeof prisma>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("GET /api/pay-records", () => {
    it("returns 401 if unauthorized", async () => {
      mockAuth.mockResolvedValueOnce(null)
      const req = new NextRequest('http://localhost/api/pay-records')
      const res = await GET(req)
      expect(res.status).toBe(401)
    })

    it("fetches own pay records for employee", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "emp-1", role: "EMPLOYEE" } })
      mockPrisma.payRecord.findMany.mockResolvedValueOnce([])

      const req = new NextRequest('http://localhost/api/pay-records')
      await GET(req)

      expect(mockPrisma.payRecord.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ userId: "emp-1" })
      }))
    })

    it("can filter by user as admin", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "admin-1", role: "ADMIN" } })
      mockPrisma.payRecord.findMany.mockResolvedValueOnce([])

      const req = new NextRequest('http://localhost/api/pay-records?userId=target-user')
      await GET(req)

      expect(mockPrisma.payRecord.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ userId: "target-user" })
      }))
    })
  })

  describe("POST /api/pay-records", () => {
    it("calculates pay record correctly", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "admin-1", role: "ADMIN" } })
      
      // Mock user
      mockPrisma.user.findUnique.mockResolvedValueOnce({ 
        id: "target-user", 
        baseMonthlySalary: 30000 
      } as any)
      
      // Mock attendances: 1 present (1.0), 1 late (0.5), 1 paid leave (1.0), 1 absent (0.0)
      mockPrisma.attendance.findMany.mockResolvedValueOnce([
        { status: "PRESENT", payMultiplier: 1.0 },
        { status: "LATE", payMultiplier: 0.5 },
        { status: "LEAVE", payMultiplier: 1.0 },
        { status: "ABSENT", payMultiplier: 0.0 },
      ] as any)
      
      // No existing record
      mockPrisma.payRecord.findUnique.mockResolvedValueOnce(null)
      mockPrisma.payRecord.create.mockResolvedValueOnce({ id: "new-record" } as any)

      const req = new NextRequest('http://localhost/api/pay-records', {
        method: 'POST',
        body: JSON.stringify({
          userId: "target-user",
          month: "2026-04",
          workingDays: 30
        })
      })

      const res = await POST(req)
      expect(res.status).toBe(200)

      // 30000 / 30 = 1000 per day
      // 1000 * (1.0 + 0.5 + 1.0 + 0.0) = 2500
      expect(mockPrisma.payRecord.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          calculatedPay: 2500,
          finalPay: 2500,
          presentDays: 1,
          lateDays: 1,
          leaveDays: 1,
          absentDays: 1
        })
      }))
    })

    it("updates existing pay record with adjustments", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "admin-1", role: "ADMIN" } })
      
      mockPrisma.user.findUnique.mockResolvedValueOnce({ 
        id: "target-user", 
        baseMonthlySalary: 30000 
      } as any)
      
      mockPrisma.attendance.findMany.mockResolvedValueOnce([
        { status: "PRESENT", payMultiplier: 1.0 },
      ] as any)
      
      // Existing record with adjustments: Bonus 500, Deduction 200
      mockPrisma.payRecord.findUnique.mockResolvedValueOnce({
        id: "existing-1",
        PayAdjustment: [
          { type: "BONUS", amount: 500 },
          { type: "DEDUCTION", amount: 200 }
        ]
      } as any)
      
      mockPrisma.payRecord.update.mockResolvedValueOnce({ id: "existing-1" } as any)

      const req = new NextRequest('http://localhost/api/pay-records', {
        method: 'POST',
        body: JSON.stringify({
          userId: "target-user",
          month: "2026-04",
          workingDays: 30
        })
      })

      await POST(req)

      // 30000 / 30 = 1000
      // Adjustments: +500 - 200 = +300
      // Final Pay: 1000 + 300 = 1300
      expect(mockPrisma.payRecord.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          calculatedPay: 1000,
          finalPay: 1300
        })
      }))
    })
  })
})
