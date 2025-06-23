const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
  console.log('Creating Electron window...');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    show: false,
    title: 'Mathematics Study Platform',
    icon: path.join(__dirname, 'icon.ico')
  });

  // Start the server
  startServer();
  
  // Load the app after server starts
  setTimeout(() => {
    console.log('Loading application...');
    mainWindow.loadURL('http://localhost:5000');
    mainWindow.show();
  }, 4000);

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  // Show dev tools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

function startServer() {
  console.log('Starting Mathematics Study Platform server...');
  
  try {
    const isWin = process.platform === 'win32';
    const npmCmd = isWin ? 'npm.cmd' : 'npm';
    
    // Use the built server if it exists, otherwise build and start
    if (app.isPackaged) {
      // In packaged app, run the built server
      const serverPath = path.join(process.resourcesPath, 'dist', 'server', 'index.js');
      console.log('Starting packaged server from:', serverPath);
      
      serverProcess = spawn('node', [serverPath], {
        env: { 
          ...process.env, 
          NODE_ENV: 'production',
          PORT: '5000'
        },
        stdio: 'pipe'
      });
    } else {
      // In development, build and start
      console.log('Building and starting development server...');
      
      // First build the app
      exec('npm run build', (error, stdout, stderr) => {
        if (error) {
          console.error('Build error:', error);
          return;
        }
        console.log('Build completed, starting server...');
        
        // Then start the server
        serverProcess = spawn(npmCmd, ['start'], {
          shell: isWin,
          env: { 
            ...process.env, 
            NODE_ENV: 'production',
            PORT: '5000'
          },
          stdio: 'pipe'
        });
        
        serverProcess.stdout.on('data', (data) => {
          console.log('Server:', data.toString());
        });
        
        serverProcess.stderr.on('data', (data) => {
          console.error('Server error:', data.toString());
        });
      });
    }
    
    if (serverProcess) {
      serverProcess.on('error', (err) => {
        console.error('Failed to start server:', err);
      });
      
      serverProcess.on('exit', (code) => {
        console.log('Server process exited with code:', code);
      });
    }
  } catch (error) {
    console.error('Error starting server:', error);
  }
}

// Create menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.executeJavaScript(`
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
              `);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Study',
      submenu: [
        {
          label: 'Previous Exercise',
          accelerator: 'Ctrl+Left',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.executeJavaScript(`
                document.dispatchEvent(new KeyboardEvent('keydown', { 
                  key: 'ArrowLeft', 
                  ctrlKey: true 
                }));
              `);
            }
          }
        },
        {
          label: 'Next Exercise',
          accelerator: 'Ctrl+Right',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.executeJavaScript(`
                document.dispatchEvent(new KeyboardEvent('keydown', { 
                  key: 'ArrowRight', 
                  ctrlKey: true 
                }));
              `);
            }
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App events
app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

// Security
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});