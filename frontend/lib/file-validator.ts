export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationOptions {
  maxFileSize?: number; // in bytes
  maxTotalSize?: number; // in bytes for all files combined
  allowedTypes?: string[]; // MIME types
  allowedExtensions?: string[]; // file extensions without dot
  maxFiles?: number;
  minFiles?: number;
  requireUniqueNames?: boolean;
}

export class FileValidator {
  private static readonly DEFAULT_MAX_FILE_SIZE = 100 * 1024 * 1024 * 1024; // 100GB
  private static readonly DEFAULT_MAX_TOTAL_SIZE = 1000 * 1024 * 1024 * 1024; // 1TB
  private static readonly DEFAULT_MAX_FILES = 100;

  public static validate(files: FileList | File[], options: ValidationOptions = {}): ValidationResult {
    const {
      maxFileSize = this.DEFAULT_MAX_FILE_SIZE,
      maxTotalSize = this.DEFAULT_MAX_TOTAL_SIZE,
      allowedTypes = [],
      allowedExtensions = [],
      maxFiles = this.DEFAULT_MAX_FILES,
      minFiles = 1,
      requireUniqueNames = false,
    } = options;

    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    const fileArray = Array.from(files);
    
    // Check file count
    if (fileArray.length < minFiles) {
      result.errors.push(`Minimum ${minFiles} file(s) required, but only ${fileArray.length} provided.`);
    }
    
    if (fileArray.length > maxFiles) {
      result.errors.push(`Maximum ${maxFiles} files allowed, but ${fileArray.length} provided.`);
    }

    // Check for duplicate names if required
    if (requireUniqueNames) {
      const names = fileArray.map(f => f.name);
      const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
      if (duplicates.length > 0) {
        result.errors.push(`Duplicate file names not allowed: ${[...new Set(duplicates)].join(', ')}`);
      }
    }

    // Calculate total size
    const totalSize = fileArray.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > maxTotalSize) {
      result.errors.push(`Total file size (${this.formatBytes(totalSize)}) exceeds limit of ${this.formatBytes(maxTotalSize)}.`);
    }

    // Validate each file
    fileArray.forEach((file) => {
      const fileErrors: string[] = [];
      const fileWarnings: string[] = [];

      // Check file size
      if (file.size > maxFileSize) {
        fileErrors.push(`File "${file.name}" size (${this.formatBytes(file.size)}) exceeds limit of ${this.formatBytes(maxFileSize)}.`);
      }

      // Check empty files
      if (file.size === 0) {
        fileWarnings.push(`File "${file.name}" is empty.`);
      }

      // Check file type by MIME type
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        fileErrors.push(`File "${file.name}" has unsupported type "${file.type}". Allowed types: ${allowedTypes.join(', ')}.`);
      }

      // Check file extension
      if (allowedExtensions.length > 0) {
        const extension = this.getFileExtension(file.name);
        if (!extension || !allowedExtensions.includes(extension)) {
          fileErrors.push(`File "${file.name}" has unsupported extension. Allowed extensions: ${allowedExtensions.map(ext => '.' + ext).join(', ')}.`);
        }
      }

      // Check for potentially dangerous files
      const dangerousExtensions = [
        'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar', 
        'ws', 'wsf', 'wsc', 'wsh', 'ps1', 'ps1xml', 'ps2', 'ps2xml', 
        'psc1', 'psc2', 'msh', 'msh1', 'msh2', 'mshxml', 'msh1xml', 'msh2xml'
      ];
      const extension = this.getFileExtension(file.name);
      if (extension && dangerousExtensions.includes(extension)) {
        fileWarnings.push(`File "${file.name}" has potentially dangerous extension ".${extension}".`);
      }

      // Add file-specific errors and warnings to result
      result.errors.push(...fileErrors);
      result.warnings.push(...fileWarnings);
    });

    // Overall validation result
    result.valid = result.errors.length === 0;

    return result;
  }

  public static validateSingle(file: File, options: ValidationOptions = {}): ValidationResult {
    return this.validate([file], options);
  }

  public static getPresetOptions(preset: 'images' | 'documents' | 'videos' | 'audio' | 'any'): ValidationOptions {
    switch (preset) {
      case 'images':
        return {
          allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'],
          allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'],
          maxFileSize: 50 * 1024 * 1024, // 50MB
        };
      
      case 'documents':
        return {
          allowedTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'text/csv',
            'application/rtf',
          ],
          allowedExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'rtf'],
          maxFileSize: 100 * 1024 * 1024, // 100MB
        };
      
      case 'videos':
        return {
          allowedTypes: [
            'video/mp4',
            'video/mpeg',
            'video/quicktime',
            'video/x-msvideo',
            'video/x-ms-wmv',
            'video/webm',
            'video/ogg',
          ],
          allowedExtensions: ['mp4', 'mpeg', 'mpg', 'mov', 'avi', 'wmv', 'webm', 'ogv'],
          maxFileSize: 100 * 1024 * 1024 * 1024, // 100GB for large video files
        };
      
      case 'audio':
        return {
          allowedTypes: [
            'audio/mpeg',
            'audio/wav',
            'audio/ogg',
            'audio/mp4',
            'audio/aac',
            'audio/flac',
          ],
          allowedExtensions: ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac'],
          maxFileSize: 500 * 1024 * 1024, // 500MB
        };
      
      case 'any':
      default:
        return {
          maxFileSize: this.DEFAULT_MAX_FILE_SIZE,
          maxTotalSize: this.DEFAULT_MAX_TOTAL_SIZE,
        };
    }
  }

  private static getFileExtension(fileName: string): string | null {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) {
      return null;
    }
    return fileName.slice(lastDotIndex + 1).toLowerCase();
  }

  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  public static createValidationSummary(result: ValidationResult): string {
    const parts: string[] = [];
    
    if (result.valid) {
      parts.push('✅ All files are valid');
    } else {
      parts.push('❌ Validation failed');
    }

    if (result.errors.length > 0) {
      parts.push(`\n\nErrors (${result.errors.length}):`);
      result.errors.forEach(error => parts.push(`• ${error}`));
    }

    if (result.warnings.length > 0) {
      parts.push(`\n\nWarnings (${result.warnings.length}):`);
      result.warnings.forEach(warning => parts.push(`• ${warning}`));
    }

    return parts.join('\n');
  }
}