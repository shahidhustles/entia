TMPL_FOLDER = .template

PDFS = paper.pdf

all: $(PDFS)

.PHONY: all clean %.md

$(TMPL_FOLDER)/ieee_bib.csl:
	curl --fail -o $@ -L https://raw.githubusercontent.com/citation-style-language/styles/master/ieee.csl

$(TMPL_FOLDER)/IEEEtran.cls:
	curl --fail -o $@ -L http://mirrors.ctan.org/macros/latex/contrib/IEEEtran/IEEEtran.cls

# This custom file is currently not supported for dynamic download and needs to
# be imported by hand if needed. Using default pandoc template for now.
$(TMPL_FOLDER)/ieee_template.latex:
	@echo "Using default pandoc LaTeX template"
	@touch $@

%.pdf: %.md bib.bib layout.yml $(TMPL_FOLDER)/ieee_bib.csl $(TMPL_FOLDER)/IEEEtran.cls $(TMPL_FOLDER)/ieee_template.latex
	# Count the words in the markdown
	@echo -n $<
	@echo -n ': '
	@pandoc --lua-filter $(TMPL_FOLDER)/wordcount.lua $< 2>/dev/null || echo "Word count not available"
	@echo

	pandoc -o $@ --citeproc --csl=$(TMPL_FOLDER)/ieee_bib.csl --bibliography=bib.bib \
		-s --pdf-engine=xelatex layout.yml $<

clean:
	rm -f $(PDFS)
