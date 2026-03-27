export interface ElectronAPI {
  close?: () => void;
  minimize?: () => void;
  maximize?: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};