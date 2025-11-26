# Quick Start Guide - Entia IEEE Paper

## 🎯 Goal

Generate a professional IEEE conference paper PDF from your Entia project documentation.

## ⚡ Quick Build (5 minutes)

### Step 1: Install Dependencies (First Time Only)

```bash
cd paper
./setup.sh
```

This installs:

- Pandoc (document converter)
- LaTeX (PDF generation)
- Required fonts and packages

### Step 2: Build the Paper

```bash
make
```

**Output**: `paper.pdf` - Your IEEE formatted research paper!

### Step 3: View the PDF

```bash
open paper.pdf
```

## 🎨 Customization

### Change Authors/Emails

Edit `layout.yml` (lines 3-20):

```yaml
author:
  - name: Prof. Naina Kokate
    email: naina.kokate@vit.edu
```

### Modify Content

Edit `paper.md` - it's just Markdown!

Sections:

- Introduction (line ~1)
- Related Work (line ~30)
- System Architecture (line ~100)
- Implementation (line ~200)
- Results (line ~350)
- Conclusion (line ~450)

### Add Citations

1. Add to `bib.bib`:

```bibtex
@article{newpaper2023,
  title={Paper Title},
  author={Author Name},
  year={2023}
}
```

2. Cite in `paper.md`:

```markdown
This is supported by research [@newpaper2023].
```

## 📋 Common Tasks

### Rebuild after changes

```bash
make
```

### Clean and rebuild

```bash
make clean
make
```

### Check word count only

```bash
pandoc --lua-filter .template/wordcount.lua paper.md
```

## ❓ Troubleshooting

### "pandoc: command not found"

```bash
brew install pandoc
```

### "xelatex: command not found"

```bash
brew install --cask basictex
export PATH="/Library/TeX/texbin:$PATH"
```

### Citation not found

- Check citation key matches between paper.md and bib.bib
- Rebuild: `make clean && make`

### LaTeX errors

```bash
sudo tlmgr update --self
sudo tlmgr update --all
```

## 📊 Paper Overview

- **Pages**: ~15-20 (typical IEEE format)
- **Words**: ~6,247
- **Sections**: 7 major sections
- **Citations**: 30+ references
- **Format**: IEEE Conference Article (two-column)

## 📁 File Guide

| File         | Purpose                  |
| ------------ | ------------------------ |
| `paper.md`   | Main content (edit this) |
| `layout.yml` | Authors, title, abstract |
| `bib.bib`    | References/citations     |
| `Makefile`   | Build commands           |
| `paper.pdf`  | Generated output         |

## 💡 Pro Tips

1. **Edit in stages**: Change one section, rebuild, check
2. **Keep citations**: Don't remove `[@citations]` from paper.md
3. **Preview often**: Run `make` frequently to catch errors early
4. **Save versions**: `cp paper.pdf paper_v1.pdf` before major changes
5. **Read README.md**: Full documentation available

## 🚀 Ready to Submit?

Before conference submission:

- ✅ Review all sections for typos
- ✅ Verify all authors and affiliations
- ✅ Check all citations are present
- ✅ Ensure figures/tables are clear
- ✅ Verify page count meets conference limits
- ✅ Test PDF opens correctly

## 📞 Need Help?

- Full docs: `README.md`
- Project details: `SUMMARY.md`
- Build issues: Check Makefile comments

---

**Time to first PDF**: ~5 minutes
**Status**: Ready to build! 🎉
