/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/crm/prospects/route'
import { GET as GET_DETAIL } from '@/app/api/crm/prospects/[id]/route'
import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    prospect: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    pipelineStage: {
      findFirst: jest.fn(),
    },
  },
}))

describe('CRM Prospects API', () => {
  const mockAuth = auth as jest.Mock
  const mockPrisma = prisma as jest.Mocked<typeof prisma>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/crm/prospects', () => {
    it('returns 401 if unauthorized', async () => {
      mockAuth.mockResolvedValueOnce(null)
      const req = new NextRequest('http://localhost/api/crm/prospects')
      const res = await GET(req)
      expect(res.status).toBe(401)
    })

    it('returns 403 for non-CRM roles', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'e1', role: 'EMPLOYEE' } })
      const req = new NextRequest('http://localhost/api/crm/prospects')
      const res = await GET(req)
      expect(res.status).toBe(403)
    })

    it('scopes a rep to their own prospects', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'rep-1', role: 'SALES_REP' } })
      ;(mockPrisma.prospect.findMany as jest.Mock).mockResolvedValueOnce([])
      const req = new NextRequest('http://localhost/api/crm/prospects')
      await GET(req)
      expect(mockPrisma.prospect.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ assignedRepId: 'rep-1' }) }),
      )
    })

    it('lets a manager filter by rep across the team', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'mgr-1', role: 'SALES_MANAGER' } })
      ;(mockPrisma.prospect.findMany as jest.Mock).mockResolvedValueOnce([])
      const req = new NextRequest('http://localhost/api/crm/prospects?repId=rep-9')
      await GET(req)
      expect(mockPrisma.prospect.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ assignedRepId: 'rep-9' }) }),
      )
    })
  })

  describe('POST /api/crm/prospects', () => {
    it('rejects a duplicate phone with 409', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'rep-1', role: 'SALES_REP' } })
      ;(mockPrisma.pipelineStage.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'stage-new' })
      ;(mockPrisma.prospect.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'existing-1' })

      const req = new NextRequest('http://localhost/api/crm/prospects', {
        method: 'POST',
        body: JSON.stringify({ companyName: 'Acme', contactName: 'Bob', phone: '+919812345678' }),
      })
      const res = await POST(req)
      expect(res.status).toBe(409)
      expect(mockPrisma.prospect.create).not.toHaveBeenCalled()
    })

    it('creates a prospect assigned to the rep itself', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'rep-1', role: 'SALES_REP' } })
      ;(mockPrisma.pipelineStage.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'stage-new' })
      ;(mockPrisma.prospect.findUnique as jest.Mock).mockResolvedValueOnce(null)
      ;(mockPrisma.prospect.create as jest.Mock).mockResolvedValueOnce({ id: 'p1' })

      const req = new NextRequest('http://localhost/api/crm/prospects', {
        method: 'POST',
        body: JSON.stringify({ companyName: 'Acme', contactName: 'Bob', phone: '+919812345678' }),
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
      expect(mockPrisma.prospect.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ assignedRepId: 'rep-1', stageId: 'stage-new' }),
        }),
      )
    })
  })

  describe('GET /api/crm/prospects/[id]', () => {
    it('forbids a rep from viewing another rep\'s prospect', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'rep-1', role: 'SALES_REP' } })
      ;(mockPrisma.prospect.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'p1',
        assignedRepId: 'rep-2',
      })
      const req = new NextRequest('http://localhost/api/crm/prospects/p1')
      const res = await GET_DETAIL(req, { params: Promise.resolve({ id: 'p1' }) })
      expect(res.status).toBe(403)
    })
  })
})
