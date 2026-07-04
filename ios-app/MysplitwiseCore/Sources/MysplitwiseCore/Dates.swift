import Foundation

public enum Frequency: String, Codable {
    case weekly, monthly, yearly
}

/// Local-calendar date helpers — port of `src/lib/dates.ts`. Deliberately uses
/// the device's local calendar/timezone throughout (never UTC) to avoid the
/// classic "expense shows as yesterday" off-by-one-day bug.
public enum Dates {
    private static var localCalendar: Calendar {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone.current
        return cal
    }

    /// Format a Date's local Y/M/D components as YYYY-MM-DD.
    public static func toISODateLocal(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = localCalendar
        formatter.timeZone = TimeZone.current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    /// Today's date as YYYY-MM-DD, in the device's local timezone.
    public static func todayISO() -> String {
        toISODateLocal(Date())
    }

    /// Parse a bare "YYYY-MM-DD" date as local midnight.
    public static func parseLocalDate(_ dateStr: String) -> Date {
        let formatter = DateFormatter()
        formatter.calendar = localCalendar
        formatter.timeZone = TimeZone.current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: dateStr) ?? Date()
    }

    /// Advance a "YYYY-MM-DD" date by one period of a recurring frequency.
    public static func advanceDate(_ dateStr: String, freq: Frequency) -> String {
        let date = parseLocalDate(dateStr)
        var cal = localCalendar
        cal.timeZone = TimeZone.current
        let component: Calendar.Component
        switch freq {
        case .weekly: component = .day
        case .monthly: component = .month
        case .yearly: component = .year
        }
        let amount = freq == .weekly ? 7 : 1
        let advanced = cal.date(byAdding: component, value: amount, to: date) ?? date
        return toISODateLocal(advanced)
    }
}
