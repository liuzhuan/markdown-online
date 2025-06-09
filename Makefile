.PHONY: deploy clean
deploy: clean
	cp -r dist/* ../tools/markdown-online/
clean:
	rm -rf ../tools/markdown-online/*
