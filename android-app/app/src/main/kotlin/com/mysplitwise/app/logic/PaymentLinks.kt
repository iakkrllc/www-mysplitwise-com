package com.mysplitwise.app.logic

import com.mysplitwise.app.model.User
import java.net.URLEncoder
import java.util.Locale

/**
 * mysplitwise Pay deep links — port of `src/lib/payment-links.ts`. These only
 * build a URL to hand off to Venmo/PayPal/Cash App; no payment is ever
 * processed in-app (mysplitwise never moves money itself).
 */
object PaymentLinks {
    private fun stripHandle(v: String): String {
        var s = v.trim()
        if (s.startsWith("@") || s.startsWith("$")) s = s.substring(1)
        s = s.replace(Regex("^https?://[^/]+/"), "")
        return s
    }

    private fun fixed2(amount: Double): String = String.format(Locale.US, "%.2f", amount)

    private fun encode(v: String): String = URLEncoder.encode(v, "UTF-8")

    fun venmoPayLink(handle: String, amount: Double, note: String): String {
        val query = "txn=pay&amount=${encode(fixed2(amount))}&note=${encode(note)}"
        return "https://venmo.com/${stripHandle(handle)}?$query"
    }

    fun paypalPayLink(handle: String, amount: Double): String =
        "https://paypal.me/${stripHandle(handle)}/${fixed2(amount)}"

    fun cashAppPayLink(handle: String, amount: Double): String =
        "https://cash.app/$${stripHandle(handle)}/${fixed2(amount)}"

    data class PayOption(val label: String, val url: String)

    /** Build the list of pay options available for a user, based on which handles they've set. */
    fun payOptionsFor(user: User, amount: Double, note: String): List<PayOption> {
        val options = mutableListOf<PayOption>()
        user.venmo?.takeIf { it.isNotEmpty() }?.let {
            options.add(PayOption("Pay with Venmo", venmoPayLink(it, amount, note)))
        }
        user.paypal?.takeIf { it.isNotEmpty() }?.let {
            options.add(PayOption("Pay with PayPal", paypalPayLink(it, amount)))
        }
        user.cashapp?.takeIf { it.isNotEmpty() }?.let {
            options.add(PayOption("Pay with Cash App", cashAppPayLink(it, amount)))
        }
        return options
    }
}
