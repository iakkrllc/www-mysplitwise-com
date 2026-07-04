import XCTest
@testable import MysplitwiseCore

final class CurrencyTests: XCTestCase {
    func testConvertSameCurrencyIsNoOp() {
        XCTAssertEqual(Currency.convert(42, from: "USD", to: "USD"), 42)
    }

    func testConvertUsesRateTable() {
        // USD -> EUR at rate 0.92
        XCTAssertEqual(Currency.convert(100, from: "USD", to: "EUR"), 92, accuracy: 0.001)
    }

    func testConvertRoundTripViaUSD() {
        let eur = Currency.convert(100, from: "USD", to: "EUR")
        let back = Currency.convert(eur, from: "EUR", to: "USD")
        XCTAssertEqual(back, 100, accuracy: 0.0001)
    }

    func testFormatMoneyUSD() {
        XCTAssertEqual(Currency.formatMoney(1234.5, code: "USD"), "$1,234.50")
    }

    func testFormatMoneyNegative() {
        XCTAssertEqual(Currency.formatMoney(-42, code: "USD"), "-$42.00")
    }

    func testFormatMoneyZeroDecimalCurrency() {
        // JPY has 0 decimals; 1234.5 rounds to 1235 (standard rounding, not truncation).
        XCTAssertEqual(Currency.formatMoney(1234.5, code: "JPY"), "¥1,235")
    }

    func testFormatMoneyUnknownCodeFallsBackToUSD() {
        XCTAssertEqual(Currency.formatMoney(10, code: "ZZZ"), "$10.00")
    }

    func testGetUnknownCodeFallsBackToUSD() {
        XCTAssertEqual(Currency.get("ZZZ").code, "USD")
    }
}
