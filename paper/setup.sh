#!/bin/bash

# Setup script for Entia IEEE Paper compilation
# This script installs necessary dependencies for macOS

echo "🔧 Entia Paper Setup Script"
echo "============================"
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew not found. Please install Homebrew first:"
    echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi

echo "✅ Homebrew found"

# Check if Pandoc is installed
if ! command -v pandoc &> /dev/null; then
    echo "📦 Installing Pandoc..."
    brew install pandoc
else
    echo "✅ Pandoc already installed"
    pandoc --version | head -1
fi

# Check if LaTeX is installed
if ! command -v xelatex &> /dev/null; then
    echo ""
    echo "📦 Installing BasicTeX (this may take a few minutes)..."
    echo "   Note: You can also install full MacTeX with: brew install --cask mactex"
    brew install --cask basictex
    
    # Update PATH for current session
    export PATH="/Library/TeX/texbin:$PATH"
    
    echo ""
    echo "⚠️  IMPORTANT: Add this to your ~/.zshrc file:"
    echo '   export PATH="/Library/TeX/texbin:$PATH"'
    echo ""
    
    # Update TeX packages
    echo "📦 Updating TeX packages..."
    sudo tlmgr update --self
    sudo tlmgr install xetex
    sudo tlmgr install collection-fontsrecommended
else
    echo "✅ XeLaTeX already installed"
    xelatex --version | head -1
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. cd paper"
echo "   2. make"
echo "   3. Open paper.pdf"
echo ""
echo "💡 If you just installed LaTeX, you may need to:"
echo "   1. Close and reopen your terminal"
echo "   2. Or run: export PATH=\"/Library/TeX/texbin:\$PATH\""
