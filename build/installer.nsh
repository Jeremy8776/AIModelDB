!macro customInit
  ; Check active instance
  
  ; Check if already installed (Standard uninstall key)
  ReadRegStr $R0 SHCTX "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" "UninstallString"
  ${If} $R0 != ""
    ; Detected existing installation
    MessageBox MB_YESNO|MB_ICONEXCLAMATION "An existing version of ${PRODUCT_NAME} was found.$\n$\nDo you want to uninstall it before continuing?$\n(Recommended for a clean install)" IDYES uninstall IDNO proceed
    
    uninstall:
      ; Run uninstaller
      ; Copy uninstaller to temp to avoid locking
      CopyFiles "$R0" "$PLUGINSDIR\uninstaller.exe"
      ExecWait '"$PLUGINSDIR\uninstaller.exe" /S _?=$INSTDIR'
      ; Wait for it to finish? ExecWait does that.
      
    proceed:
  ${EndIf}
!macroend
