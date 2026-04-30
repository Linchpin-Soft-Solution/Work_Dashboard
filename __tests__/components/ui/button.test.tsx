import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe("Button component", () => {
  it("renders correctly with default props", () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole("button", { name: /click me/i })
    expect(button).toBeInTheDocument()
    expect(button.className).toContain("bg-primary")
  })

  it("handles clicks correctly", () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByRole("button", { name: /click me/i })
    fireEvent.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("renders different variants correctly", () => {
    render(<Button variant="destructive">Destructive</Button>)
    const button = screen.getByRole("button", { name: /destructive/i })
    expect(button.className).toContain("text-destructive")
  })
})
