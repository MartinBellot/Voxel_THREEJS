rsync -av --exclude='db.sqlite3' --exclude='__pycache__' --exclude='*.pyc' api/ root@148.230.117.98:/root/ONDESVOXEL/api/
npm run build
cp -r assets/ dist/
scp -r dist/ root@148.230.117.98:/root/ONDESVOXEL/web/
rm -rf dist/