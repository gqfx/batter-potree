/**
 * Version comparison utility
 * Used for comparing Potree format versions
 */

export class Version {
  version: string;
  versionMajor: number;
  versionMinor: number;

  constructor(version: string) {
    this.version = version;
    const vmLength = version.indexOf('.') === -1 ? version.length : version.indexOf('.');
    this.versionMajor = Number.parseInt(version.substring(0, vmLength), 10);
    const minorStr = version.substring(vmLength + 1);
    this.versionMinor = minorStr.length > 0 ? Number.parseInt(minorStr, 10) : 0;
  }

  /**
   * Check if this version is newer than the given version
   */
  newerThan(version: string): boolean {
    const v = new Version(version);

    if (this.versionMajor > v.versionMajor) {
      return true;
    }
    if (this.versionMajor === v.versionMajor && this.versionMinor > v.versionMinor) {
      return true;
    }
    return false;
  }

  /**
   * Check if this version is equal or higher than the given version
   */
  equalOrHigher(version: string): boolean {
    const v = new Version(version);

    if (this.versionMajor > v.versionMajor) {
      return true;
    }
    if (this.versionMajor === v.versionMajor && this.versionMinor >= v.versionMinor) {
      return true;
    }
    return false;
  }

  /**
   * Check if this version is up to (not newer than) the given version
   */
  upTo(version: string): boolean {
    return !this.newerThan(version);
  }

  /**
   * Get string representation
   */
  toString(): string {
    return this.version;
  }
}
