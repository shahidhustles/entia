# Entia Research Paper

This directory contains the IEEE conference paper for the Entia project.

## Files

- **paper.md** - Main paper content in Markdown format
- **layout.yml** - Metadata (title, authors, abstract, keywords)
- **bib.bib** - Bibliography in BibTeX format
- **Makefile** - Build pipeline for PDF generation
- **.template/** - Templates and support files

## Requirements

To compile the paper to PDF, you need:

### macOS

```bash
# Install Pandoc
brew install pandoc

# Install BasicTeX (smaller) or MacTeX (full)
brew install --cask basictex
# OR for full installation:
# brew install --cask mactex

# Update PATH (add to ~/.zshrc)
export PATH="/Library/TeX/texbin:$PATH"

# Update TeX packages
sudo tlmgr update --self
sudo tlmgr install xetex
sudo tlmgr install collection-fontsrecommended
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install pandoc texlive-xetex texlive-fonts-recommended
```

## Building the Paper

### Compile to PDF

```bash
cd paper
make
```

This will:

1. Download IEEE citation style (first time only)
2. Download IEEEtran LaTeX class (first time only)
3. Count words in the paper
4. Generate `paper.pdf` in IEEE conference format

### Clean Build Artifacts

```bash
make clean
```

## Editing the Paper

### Content Structure

The paper follows standard IEEE conference paper structure:

1. **Introduction** - Problem statement, motivation, contributions
2. **Related Work** - Literature review of existing systems
3. **System Architecture** - High-level design and components
4. **Implementation** - Technical details and algorithms
5. **Results and Evaluation** - Use cases, metrics, limitations
6. **Conclusion and Future Work** - Summary and future directions
7. **References** - Automatically generated from bib.bib

### Adding Citations

1. Add BibTeX entry to `bib.bib`:

```bibtex
@article{author2023title,
  title={Paper Title},
  author={Author, Name},
  journal={Journal Name},
  year={2023}
}
```

2. Cite in `paper.md`:

```markdown
This is a citation [@author2023title].
Multiple citations [@author2023title; @another2023].
Citation with page number [@author2023title, p. 42].
```

### Formatting

- **Sections**: Use `#` for sections, `##` for subsections
- **Emphasis**: Use `*italic*` or `**bold**`
- **Code**: Use backticks for inline `code` or triple backticks for blocks
- **Lists**: Use `-` for bullets or `1.` for numbered
- **Math**: Use `$inline math$` or `$$display math$$` (LaTeX syntax)
- **Tables**: Use standard Markdown tables
- **Figures**: Use `![Caption](path/to/image.png)`

### Example Math

Inline: $E = mc^2$

Display block:

$$
\int_{a}^{b} f(x)dx = F(b) - F(a)
$$

### Code Blocks

```typescript
function example() {
  return "syntax highlighted";
}
```

## Paper Metadata

Edit `layout.yml` to update:

- Title
- Authors and affiliations
- Abstract
- Keywords

## Word Count

The Makefile automatically counts words when building. For manual count:

```bash
pandoc --lua-filter .template/wordcount.lua paper.md
```

## Troubleshooting

### Pandoc not found

```bash
which pandoc
# If not found, reinstall pandoc
```

### LaTeX errors

```bash
# Update TeX Live
sudo tlmgr update --self
sudo tlmgr update --all
```

### Missing fonts

```bash
# Install recommended fonts
sudo tlmgr install collection-fontsrecommended
sudo tlmgr install collection-fontsextra
```

### Citation issues

- Ensure all citations in paper.md have corresponding entries in bib.bib
- Check BibTeX syntax in bib.bib
- Verify citation keys match exactly

## IEEE Format Notes

The paper uses IEEE conference article format with:

- Two-column layout
- 10pt font
- IEEE citation style (numbered)
- Standard IEEE section formatting

## Output

After running `make`, you'll get:

- **paper.pdf** - Camera-ready IEEE formatted paper
- Word count displayed during build

## Tips

1. **Iterate quickly**: Edit paper.md, run `make`, review PDF
2. **Check citations**: Ensure all [@citations] are in bib.bib
3. **Review formatting**: Preview math, code blocks, and tables in PDF
4. **Word limits**: IEEE conferences typically have 6-8 page limits
5. **Figures**: Use vector formats (PDF, SVG) when possible for quality

## Authors

- Prof. Naina Kokate
- Mohammed Shahid Patel
- Anagh Pandilwar
- Eeshan Patanakar
- Digvijay Patil

**Institution**: Vishwakarma Institute of Technology, Pune

## License

This paper is for academic submission to IEEE conferences.
