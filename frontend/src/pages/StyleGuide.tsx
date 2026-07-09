import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { useTheme } from "@/hooks/useTheme"
import { SearchModeToggle, type SearchMode } from "@/components/search/SearchModeToggle"
import { SimilarityBadge } from "@/components/search/SimilarityBadge"
import { DropZone } from "@/components/search/DropZone"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { AnimatedBackground } from "@/components/ui/AnimatedBackground"
import { ImageUploadZone } from "@/components/search/ImageUploadZone"
import { SearchBar } from "@/components/search/SearchBar"
import { TextSearchInput } from "@/components/search/TextSearchInput"
import { ImageDetailModal } from "@/components/results/ImageDetailModal"
import { ImageResultCard } from "@/components/results/ImageResultCard"
import { MasonryGrid, type SearchResult } from "@/components/results/MasonryGrid"
import { SkeletonGrid } from "@/components/results/SkeletonGrid"

const mockResult: SearchResult = {
  id: '1',
  thumbnailUrl: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=500&q=80',
  fullUrl: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba',
  title: 'Beautiful mountain landscape at sunset',
  similarityScore: 0.95,
  aspectRatio: '1.5',
  ocrText: 'Sunset 2023',
  source: 'Unsplash'
}

const mockResults: SearchResult[] = [
  mockResult,
  { ...mockResult, id: '2', similarityScore: 0.7, aspectRatio: '0.8', title: 'Vertical image' },
  { ...mockResult, id: '3', similarityScore: 0.4, aspectRatio: '1.2', title: 'Another landscape' }
]

export function StyleGuide() {
  const [searchMode, setSearchMode] = React.useState<SearchMode>("image")
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const { theme, resolvedTheme } = useTheme()

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 pb-20 relative overflow-hidden">
      <AnimatedBackground subtle />
      <div className="max-w-5xl mx-auto space-y-12 sm:space-y-16 relative z-10">
        <header className="space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-display font-bold text-gradient-brand">Design System</h1>
          <p className="text-base sm:text-lg text-muted-foreground">
            Visual Search Engine — W1 UI Components & Tokens (Indigo/Violet)
          </p>
        </header>

        <Separator />

        {/* --- Theme --- */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">0. Theme System</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Live toggle demo */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-5 shadow-card">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Live Theme Toggle</h3>
                <p className="text-sm text-muted-foreground">
                  Switch between Light, Dark, and System (follows OS setting).
                  Selection persists via <code className="text-xs bg-muted px-1.5 py-0.5 rounded">localStorage</code>.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <ThemeToggle />
                <div className="text-sm">
                  <span className="text-muted-foreground">Selected: </span>
                  <span className="font-semibold text-foreground capitalize">{theme}</span>
                  {theme === "system" && (
                    <span className="text-muted-foreground"> → resolved as{" "}
                      <span className="font-semibold text-foreground capitalize">{resolvedTheme}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Theme info */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-card">
              <h3 className="text-lg font-semibold">Implementation</h3>
              <ul className="space-y-2 text-sm">
                {[
                  ["ThemeProvider", "Context + localStorage + OS media query"],
                  ["useTheme()", "Hook — access theme, resolvedTheme, setTheme"],
                  ["ThemeToggle", "Icon button dropdown — Sun / Moon / Monitor"],
                  [".dark class", "Applied to <html> — triggers all CSS vars"],
                  ["Transition", "250ms ease on bg/text/border (html level)"],
                ].map(([key, val]) => (
                  <li key={key} className="flex gap-2">
                    <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">{key}</code>
                    <span className="text-muted-foreground">{val}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <Separator />

        {/* --- Colors --- */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">1. Colors (Brand & Semantic)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ColorSwatch name="Brand" className="bg-primary text-primary-foreground" />
            <ColorSwatch name="Brand Light" className="bg-[var(--brand-light)] text-primary-foreground" />
            <ColorSwatch name="Accent Cyan" className="bg-[var(--accent-cyan)] text-white" />
            <ColorSwatch name="Gradient" className="gradient-brand text-white" />
            
            <ColorSwatch name="Background" className="bg-background border border-border" />
            <ColorSwatch name="Surface" className="bg-[var(--surface)] border border-border" />
            <ColorSwatch name="Card" className="bg-card border border-border" />
            <ColorSwatch name="Muted" className="bg-muted text-muted-foreground" />
          </div>
        </section>

        {/* --- Typography --- */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">2. Typography (Geist Variable)</h2>
          <div className="space-y-4 bg-card border border-border rounded-xl p-4 sm:p-6">
            <div className="flex flex-wrap items-baseline gap-2 sm:gap-4">
              <span className="w-16 sm:w-24 text-xs sm:text-sm text-muted-foreground shrink-0">Display</span>
              <span className="text-2xl sm:text-display font-bold">Search Beyond Words</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-2 sm:gap-4">
              <span className="w-16 sm:w-24 text-xs sm:text-sm text-muted-foreground shrink-0">H1</span>
              <h1 className="text-2xl sm:text-4xl font-semibold">Visual Search Engine</h1>
            </div>
            <div className="flex flex-wrap items-baseline gap-2 sm:gap-4">
              <span className="w-16 sm:w-24 text-xs sm:text-sm text-muted-foreground shrink-0">H2</span>
              <h2 className="text-xl sm:text-3xl font-semibold">Kết quả tìm kiếm</h2>
            </div>
            <div className="flex flex-wrap items-baseline gap-2 sm:gap-4">
              <span className="w-16 sm:w-24 text-xs sm:text-sm text-muted-foreground shrink-0">H3</span>
              <h3 className="text-lg sm:text-2xl font-medium">Chi tiết hình ảnh</h3>
            </div>
            <div className="flex flex-wrap items-baseline gap-2 sm:gap-4">
              <span className="w-16 sm:w-24 text-xs sm:text-sm text-muted-foreground shrink-0">Body Lg</span>
              <p className="text-base sm:text-lg">Khám phá hàng triệu hình ảnh tương tự chỉ bằng một cú click.</p>
            </div>
            <div className="flex flex-wrap items-baseline gap-2 sm:gap-4">
              <span className="w-16 sm:w-24 text-xs sm:text-sm text-muted-foreground shrink-0">Body</span>
              <p className="text-sm sm:text-base">Hệ thống hỗ trợ tìm kiếm bằng hình ảnh, ngữ nghĩa và nhận dạng chữ (OCR).</p>
            </div>
            <div className="flex flex-wrap items-baseline gap-2 sm:gap-4">
              <span className="w-16 sm:w-24 text-xs sm:text-sm text-muted-foreground shrink-0">Caption</span>
              <span className="text-xs sm:text-sm text-muted-foreground">JPG, PNG, WebP &lt; 10MB</span>
            </div>
          </div>
        </section>

        {/* --- Buttons --- */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">3. Buttons</h2>
          
          <div className="space-y-8">
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-muted-foreground">Brand Variants</h3>
              <div className="flex flex-wrap items-center gap-4 p-6 border rounded-xl bg-background">
                <Button variant="glow" size="xl">Main Search Glow</Button>
                <Button variant="brand" size="lg">Brand Primary</Button>
                <Button variant="brand-outline">Brand Outline</Button>
                <Button variant="brand-ghost">Brand Ghost</Button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-muted-foreground">Standard Variants</h3>
              <div className="flex flex-wrap items-center gap-4">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="soft">Soft</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-muted-foreground">Sizes</h3>
              <div className="flex flex-wrap items-center gap-4">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="xl">Extra Large</Button>
              </div>
            </div>
          </div>
        </section>

        {/* --- Custom Search Components --- */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">4. Custom Search UI</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Search Mode Toggle</h3>
              <SearchModeToggle value={searchMode} onChange={setSearchMode} />
              
              <div className="pt-4">
                <h3 className="text-lg font-medium mb-3">Similarity Badges</h3>
                <div className="flex flex-col gap-3 items-start">
                  <SimilarityBadge score={92} showLabel />
                  <SimilarityBadge score={65} showLabel />
                  <SimilarityBadge score={32} showLabel />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Drop Zone</h3>
              <DropZone onFileSelect={(file) => console.log(file)} />
            </div>
          </div>
        </section>

        {/* --- Advanced UI Components --- */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">5. Advanced UI Components</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Dialog</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Open Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Example Dialog</DialogTitle>
                    <DialogDescription>
                      This is an example dialog to show the design pattern.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">Dialog content goes here.</div>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Tooltip & Spinner</h3>
              <div className="flex items-center gap-6">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline">Hover me</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This is a tooltip</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <div className="flex items-center gap-2 bg-card border border-border p-3 rounded-lg shadow-sm">
                  <Spinner size="md" />
                  <span className="text-sm font-medium">Loading...</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* --- Full Search Components --- */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">6. Full Search Components</h2>
          
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Search Bar (Master Component)</h3>
              <SearchBar onSearch={(state) => console.log('Search:', state)} />
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Image Upload Zone</h3>
                <ImageUploadZone onImageSelect={(file, url) => console.log(file, url)} onClear={() => {}} />
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Text Search Input</h3>
                <TextSearchInput mode="semantic" value="" onChange={() => {}} onSearch={() => {}} />
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* --- Results Components --- */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">7. Results Components</h2>
          
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Image Result Card</h3>
              <div className="w-64">
                <ImageResultCard 
                  result={mockResult} 
                  onClick={() => setIsModalOpen(true)} 
                  onSearchSimilar={() => {}} 
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Masonry Grid</h3>
              <MasonryGrid 
                results={mockResults} 
                onCardClick={() => setIsModalOpen(true)} 
                onSearchSimilar={() => {}} 
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Skeleton Grid (Loading State)</h3>
              <SkeletonGrid count={8} />
            </div>
            
            <ImageDetailModal 
              result={isModalOpen ? mockResult : null} 
              onClose={() => setIsModalOpen(false)} 
              onSearchSimilar={() => setIsModalOpen(false)} 
            />
          </div>
        </section>

        <Separator />

        {/* --- Base Components --- */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">8. Data Display & Inputs</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="shadow-card-hover interactive">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>Image Result Card</CardTitle>
                    <CardDescription>Hover over this card</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="w-full h-32 bg-muted rounded-md flex items-center justify-center">
                  Image Placeholder
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Badge variant="secondary">Sunset</Badge>
                <SimilarityBadge score={85} />
              </CardFooter>
            </Card>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="search">Search Input</Label>
                <div className="flex gap-2">
                  <Input id="search" placeholder="Type something..." />
                  <Button variant="brand">Search</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Loading Skeletons</Label>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function ColorSwatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className={`h-24 w-full rounded-xl ${className} shadow-sm`} />
      <span className="text-sm font-medium">{name}</span>
    </div>
  )
}
