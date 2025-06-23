const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let serverProcess;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png'), // Add your app icon here
    show: false, // Don't show until ready
    titleBarStyle: 'default',
    title: 'Mathematics Study Platform'
  });

  // Start the server in development mode
  if (isDev) {
    startDevServer();
    mainWindow.loadURL('http://localhost:5000');
    mainWindow.webContents.openDevTools();
  } else {
    startProductionServer();
    mainWindow.loadURL('http://localhost:5000');
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startDevServer() {
  console.log('Starting development server...');
  serverProcess = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'development' },
    stdio: 'inherit'
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start development server:', err);
  });
}

function startProductionServer() {
  console.log('Starting production server...');
  serverProcess = spawn('npm', ['start'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: 'inherit'
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start production server:', err);
  });
}

// Create application menu
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
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
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
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            // You can show an about dialog here
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
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
  // Kill server process
  if (serverProcess) {
    serverProcess.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Kill server process
  if (serverProcess) {
    serverProcess.kill();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});