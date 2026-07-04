// swift-tools-version:5.9
import PackageDescription

// Deliberately NOT platform-restricted (no `platforms:` entry) — this package has
// zero SwiftUI/UIKit imports and must be buildable/testable with a plain `swift
// build`/`swift test` on any OS with a Swift toolchain (including the Windows
// Swift toolchain, where Xcode isn't available). The iOS app target consumes it
// as a local package dependency and applies its own iOS 16 deployment target.
let package = Package(
    name: "MysplitwiseCore",
    products: [
        .library(name: "MysplitwiseCore", targets: ["MysplitwiseCore"])
    ],
    targets: [
        .target(name: "MysplitwiseCore"),
        .testTarget(name: "MysplitwiseCoreTests", dependencies: ["MysplitwiseCore"]),
    ]
)
