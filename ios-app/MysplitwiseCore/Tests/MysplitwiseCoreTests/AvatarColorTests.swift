import XCTest
@testable import MysplitwiseCore

final class AvatarColorTests: XCTestCase {
    func testDeterministic() {
        let a = AvatarColor.pick(seed: "alice@example.com")
        let b = AvatarColor.pick(seed: "alice@example.com")
        XCTAssertEqual(a, b)
    }

    func testDifferentSeedsCanProduceDifferentColors() {
        let colors = Set(["alice@example.com", "bob@example.com", "carol@example.com", "dave@example.com"]
            .map { AvatarColor.pick(seed: $0) })
        // Not guaranteed all-distinct, but with 12 buckets and 4 seeds it would be
        // suspicious if the hash were broken (e.g. always returning index 0).
        XCTAssertGreaterThan(colors.count, 1)
    }

    func testResultIsAlwaysInPalette() {
        for seed in ["", "a", "z", "🙂", "a-very-long-email-address@example.com"] {
            XCTAssertTrue(AvatarColor.palette.contains(AvatarColor.pick(seed: seed)))
        }
    }

    func testEmptySeedDoesNotCrash() {
        XCTAssertEqual(AvatarColor.pick(seed: ""), AvatarColor.palette[0])
    }
}
