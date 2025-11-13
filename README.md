# Teklif360

<div align="center">
  <img src="Logo/Teklif360-Logo.png" alt="Teklif360 Logo" width="200" height="200">
  <h3>Advanced Tender Document Converter for Construction Professionals</h3>
  <p>Professional automation tool for converting tender documents from Word to Excel with intelligent price matching</p>
</div>

---

## 🎯 Overview

**Teklif360** is a sophisticated tender document processing tool designed specifically for construction professionals, contractors, and procurement specialists. It provides an intelligent, multi-step approach to automatically converting Word tender documents to Excel format with advanced PDF price list matching capabilities.

## ✨ Features

### 🔍 **Intelligent Document Processing**
- **Word Parser**: Automatic extraction of tender items from .docx/.doc files
- **Smart Table Detection**: Advanced pattern matching for table structures
- **Multi-Field Extraction**: Position number, description, unit, quantity parsing
- **10MB File Support**: Process large tender documents effortlessly

### 🎯 **Advanced Price Matching**
- **Multi-PDF Support**: Upload and process multiple price lists simultaneously
- **3-Level Matching Algorithm**:
  - **Exact Match**: 100% accuracy with POZ NO matching
  - **Partial POZ Match**: Group-based search (e.g., 15.185.*)
  - **Fuzzy Matching**: Intelligent name similarity matching
- **675-Page PDF Processing**: Handle massive price lists without issues
- **Turkish Unit Support**: m³, m², metrekare, metreküp, ton, adet, etc.

### 🛡️ **Smart Similarity Algorithm**
- **Jaccard Similarity**: Word set intersection analysis
- **Substring Matching**: Important keyword presence detection
- **Levenshtein Distance**: Edit distance calculation
- **Keyword Extraction**: Turkish stop words filtering
- **Weighted Score**: Combined algorithm for optimal results

### 🤖 **Intelligent Data Preview**
- **Live Statistics**: Total items, priced, pending counts
- **Color-Coded Rows**:
  - 🟢 Green: 100% exact match
  - 🟡 Yellow: 50-99% good similarity match
  - 🟠 Orange: 20-49% low confidence match
  - 🔴 Red: No match found
- **Advanced Filtering**: Exact / Similar / Unmatched categories
- **Confidence Badges**: Percentage indicators for each row

### 🌐 **Excel Export**
- **Formula-Based Excel**: Automatic quantity × unitPrice = total calculations
- **Turkish Number Format**: 1.234,56 formatting
- **Auto-Sum**: Automatic total calculations
- **Professional Layout**: Clean, ready-to-use Excel output

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun 1.0+
- npm / yarn / pnpm / bun package manager

### Installation

1. **Clone the repository**
```bash
   git clone https://github.com/yusuwyildirim/teklif360.git
   cd teklif360
```

2. **Install dependencies**
```bash
   npm install
   # or
   bun install
```

3. **Copy PDF.js worker file**
```bash
   npm run copy-pdf-worker
   # or manually:
   # Windows: Copy-Item "node_modules\pdfjs-dist\build\pdf.worker.min.mjs" -Destination "public\pdf.worker.min.mjs"
   # Linux/Mac: cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs
```

4. **Start development server**
```bash
   npm run dev
   # or
   bun dev
```

5. **Open your browser**
```
   http://localhost:8080
```

### Production Build
```bash
npm run build
npm run preview
```

## 📖 Usage Guide

### Basic Workflow

1. **Upload Word Document**
   - Click "Select File" or drag-and-drop
   - Maximum 10MB .docx file support
   - Automatic table structure detection

2. **Upload PDF Price Lists**
   - Multiple PDF selection supported
   - Process up to 675 pages per PDF
   - Remove individual files as needed

3. **Review Matching Results**
   - **Statistics**: Total / Priced / Pending counts
   - **Filtering**: Exact, Similar, Unmatched categories
   - **Color Codes**: Confidence score-based visualization
   - **Confidence Badges**: Percentage indicators

4. **Download Excel**
   - Click "Download Excel" button
   - Get .xlsx file with formulas and totals
   - Ready for immediate use

### Advanced Features

#### Multi-Step Wizard
- Guided workflow from Word upload to Excel download
- Progress tracking and status indicators
- Error handling and validation at each step

#### Intelligent Filtering
- Filter by match quality
- View statistics for each category
- Quick navigation between matched/unmatched items

#### Bulk Operations
- Process multiple PDFs simultaneously
- Batch price matching
- Export complete results

## 🛠️ Technical Architecture

### Frontend Stack
- **React 18.3.1**: Modern React with hooks and functional components
- **TypeScript 5.6.2**: Type-safe development with full IntelliSense
- **Vite 6.0.1**: Lightning-fast build tool with HMR
- **React Router 7.1.1**: Client-side routing and navigation
- **TanStack Query 5.62.11**: Powerful data synchronization

### UI/UX Framework
- **TailwindCSS 3.4.1**: Utility-first CSS framework for responsive design
- **shadcn/ui**: High-quality, accessible UI components
- **Lucide React**: Beautiful, customizable icons
- **Sonner**: Toast notifications for user feedback

### Document Processing
- **mammoth 1.8.0**: Word (.docx) document parsing
- **pdfjs-dist 5.4.394**: PDF text extraction engine
- **ExcelJS 4.4.0**: Excel file generation with formulas

### Algorithms & Utilities
- **string-similarity 4.0.4**: Levenshtein distance calculation
- **clsx + tailwind-merge**: Class name management

## 📊 Matching Algorithm Details

### 3-Level Matching System

#### Level 1: Exact POZ NO Match
```typescript
// Direct position number matching
const exactMatch = priceList.find(item => item.pozNo === targetPozNo);
// Confidence: 100%
```

#### Level 2: Partial POZ Match
```typescript
// Example: 15.185.1013 not found
// Step 1: Find items starting with 15.185.*
const prefix = "15.185";
const candidates = priceList.filter(item => item.pozNo.startsWith(prefix));

// Step 2: Sort by description similarity
candidates.sort((a, b) => similarity(desc, a.desc) - similarity(desc, b.desc));

// Step 3: Return best match (min 20% confidence)
return candidates[0]; // 15.185.1008 (Confidence: 42%)
```

#### Level 3: Fuzzy Description Match
```typescript
// Combined similarity algorithm
Similarity Score = (Jaccard × 0.5) + (Substring × 0.3) + (Levenshtein × 0.2)

// Jaccard Similarity: Word set intersection
const jaccard = intersection(words1, words2) / union(words1, words2);

// Substring Matching: Important keyword presence
const substring = matchedKeywords / totalKeywords;

// Levenshtein Distance: Edit distance normalization
const levenshtein = 1 - (editDistance / maxLength);
```

### Keyword Extraction
```typescript
// Turkish stop words filtering
const stopWords = ['ile', 'her', 'turlu', 'yapilmasi', 'icin', 'olan', ...];
const keywords = text.split(/\s+/)
  .filter(w => w.length > 3)
  .filter(w => !stopWords.has(w.toLowerCase()));

// Keyword bonus (+20% similarity)
if (keywords overlap in both texts) {
  similarity += (matchedKeywords / totalKeywords) * 0.2;
}
```

## 📂 Project Structure
```
teklif360/
├── src/
│   ├── components/              # React components
│   │   ├── ui/                 # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── table.tsx
│   │   │   └── ...
│   │   ├── FileUploader.tsx    # Word file upload
│   │   ├── PdfUploader.tsx     # Multi-PDF upload
│   │   ├── DataPreview.tsx     # Table + filtering
│   │   ├── ProcessingStatus.tsx # Loading indicators
│   │   └── Header.tsx          # Navigation header
│   ├── services/               # Business logic
│   │   ├── wordParser.ts       # Word parsing (mammoth)
│   │   ├── pdfParser.ts        # PDF parsing (pdfjs)
│   │   ├── priceMatching.ts    # 3-level matching algorithm
│   │   └── excelGenerator.ts   # Excel generation (ExcelJS)
│   ├── pages/                  # Route pages
│   │   ├── Index.tsx          # Main multi-step wizard
│   │   └── NotFound.tsx       # 404 page
│   ├── types/                  # TypeScript types
│   │   └── tender.types.ts
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-toast.ts
│   │   └── use-mobile.tsx
│   ├── lib/                    # Utilities
│   │   └── utils.ts           # cn() helper
│   └── App.tsx                 # Root component + router
├── public/
│   ├── pdf.worker.min.mjs     # PDF.js worker (required!)
│   ├── favicon.ico            # Teklif360 icon
│   └── robots.txt
├── Logo/                       # Project logos
│   ├── Teklif360-Logo.png
│   └── Teklif360-PNG-ICO.png
├── vite.config.ts             # Vite configuration
├── tailwind.config.ts         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
├── package.json               # Dependencies
└── README.md
```

## 🧪 Development

### Code Linting
```bash
npm run lint
```

### Production Build
```bash
npm run build
npm run preview  # Test the build
```

### Environment Variables
This project is a client-side SPA and does not require .env files.

### Important Notes
- **PDF.js Worker**: The `public/pdf.worker.min.mjs` file is **mandatory**
- **Path Alias**: `@/` = `src/` (configured in vite.config.ts)
- **Development Port**: 8080 (configured in vite.config.ts)

## ⚠️ Known Issues

- [ ] Very large Word files (>10MB) may process slowly
- [ ] Some legacy `.doc` formats may cause issues
- [ ] Handwritten text in PDFs cannot be recognized

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

### Development Setup
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Message Format
```
feat: New feature
fix: Bug fix
docs: Documentation change
style: Code style change
refactor: Code refactoring
test: Add/fix tests
chore: Build/config change
```

### Code Style
- Follow TypeScript best practices
- Use meaningful variable and function names
- Add comments for complex logic
- Ensure responsive design compatibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Yusuf Yıldırım** ([@yusuwyildirim](https://github.com/yusuwyildirim))

- Software Engineer
- Construction Technology Specialist
- Open Source Contributor

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) - Amazing UI components
- [TailwindCSS](https://tailwindcss.com/) - CSS framework
- [Mammoth.js](https://github.com/mwilliamson/mammoth.js) - Word parsing
- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF rendering
- [ExcelJS](https://github.com/exceljs/exceljs) - Excel file processing

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yusuwyildirim/teklif360/issues) page
2. Create a new issue with detailed information
3. Contact the author through GitHub

---

<div align="center">
  <p>Made with ❤️ for the construction industry</p>
  <p>⭐ Star this repository if you find it useful!</p>
</div>