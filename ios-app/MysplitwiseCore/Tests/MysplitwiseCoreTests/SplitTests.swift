import XCTest
@testable import MysplitwiseCore

final class SplitTests: XCTestCase {
    func testEqualSplitExact() {
        XCTAssertEqual(Split.equal(amount: 100, n: 4), [25, 25, 25, 25])
    }

    func testEqualSplitWithRemainderGoesToFirstParticipants() {
        // 10.00 / 3 = 3.33333..., cents = 1000, base = 333, rem = 1 -> first participant gets the extra cent.
        let result = Split.equal(amount: 10, n: 3)
        XCTAssertEqual(result, [3.34, 3.33, 3.33])
        XCTAssertEqual(result.reduce(0, +), 10, accuracy: 0.0001)
    }

    func testEqualSplitZeroParticipants() {
        XCTAssertEqual(Split.equal(amount: 50, n: 0), [])
    }

    func testByPercentSumsExactlyToAmount() {
        // 33.33 / 33.33 / 33.34 style drift correction.
        let result = Split.byPercent(amount: 100, percents: [33.33, 33.33, 33.34])
        XCTAssertEqual(result.reduce(0, +), 100, accuracy: 0.0001)
    }

    func testByPercentRoundRobinDriftCorrection() {
        // amount=10, percents summing to 100 but with a 3-way split producing rounding drift.
        let result = Split.byPercent(amount: 10, percents: [1.0 / 3.0 * 100, 1.0 / 3.0 * 100, 1.0 / 3.0 * 100])
        XCTAssertEqual(result.reduce(0, +), 10, accuracy: 0.0001)
        // Round-robin starts at index 0, so any extra/missing cent lands on the first entries.
        XCTAssertEqual(result[0], 3.34, accuracy: 0.0001)
    }

    func testBySharesProportional() {
        // shares 1:1:2 of 40 -> 10/10/20
        let result = Split.byShares(amount: 40, shares: [1, 1, 2])
        XCTAssertEqual(result, [10, 10, 20])
    }

    func testBySharesZeroTotalReturnsZeros() {
        XCTAssertEqual(Split.byShares(amount: 40, shares: [0, 0]), [0, 0])
    }
}
