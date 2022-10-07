BRANCH=$(git branch --show-current)

(cd dist; git add --all)
(cd dist; git commit -m "Build output as of $(shell git log '--format=format:%H' $BRANCH -1)" || echo "No changes to commit.")
(cd dist; git push -u origin gh-pages)
git worktree remove $1
git branch -D gh-pages
