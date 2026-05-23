import { cn, todayIST } from "@/lib/utils"

describe("utils", () => {
  describe("cn", () => {
    it("should merge class names correctly", () => {
      expect(cn("bg-red-500", "text-white")).toBe("bg-red-500 text-white")
    })

    it("should override tailwind classes correctly", () => {
      expect(cn("bg-red-500 p-4", "bg-blue-500")).toBe("p-4 bg-blue-500")
    })

    it("should handle conditional classes", () => {
      const isTrue = true
      const isFalse = false
      expect(cn("p-4", isTrue && "bg-green-500", isFalse && "bg-red-500")).toBe("p-4 bg-green-500")
    })
  })

  describe("todayIST", () => {
    it("should return a valid Date object representing midnight UTC", () => {
      const today = todayIST();
      expect(today).toBeInstanceOf(Date);
      expect(today.getUTCHours()).toBe(0);
      expect(today.getUTCMinutes()).toBe(0);
      expect(today.getUTCSeconds()).toBe(0);
      expect(today.getUTCMilliseconds()).toBe(0);
    });
  });
})
