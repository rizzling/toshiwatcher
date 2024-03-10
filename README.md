$user:
sudo apt-get update
sudo apt-get install git
sudo apt-get install tmux
git clone https://github.com/rizzling/toshiwatcher.git
sudo apt update
sudo apt install nodejs
sudo apt install npm
cd toshiwatcher
npm install
export SEC_K=<SEC_KEY>

update: git pull origin main

start:

tmux 
tmxu attach-session -t -0

CTRL + B  then D , to exit tmux session
