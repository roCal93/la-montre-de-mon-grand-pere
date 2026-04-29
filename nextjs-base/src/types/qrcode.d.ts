declare module 'qrcode' {
  interface ToDataURLOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
    margin?: number
    width?: number
  }

  const QRCode: {
    toDataURL(text: string, options?: ToDataURLOptions): Promise<string>
  }

  export default QRCode
}
