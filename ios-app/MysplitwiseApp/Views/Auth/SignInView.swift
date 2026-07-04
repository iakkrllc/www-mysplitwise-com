import SwiftUI

struct SignInView: View {
    @EnvironmentObject var authStore: AuthStore
    @State private var mode: Mode = .signIn
    @State private var method: Method = .email

    enum Mode { case signIn, signUp }
    enum Method { case email, phone }

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Text("mysplitwise")
                    .font(.largeTitle.bold())
                    .padding(.top, 40)

                Picker("Mode", selection: $mode) {
                    Text("Log in").tag(Mode.signIn)
                    Text("Sign up").tag(Mode.signUp)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)

                Picker("Method", selection: $method) {
                    Text("Email").tag(Method.email)
                    Text("Phone").tag(Method.phone)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)

                if method == .email {
                    EmailAuthForm(mode: mode)
                } else {
                    PhoneAuthForm(mode: mode)
                }

                Spacer()
            }
        }
    }
}

private struct EmailAuthForm: View {
    @EnvironmentObject var authStore: AuthStore
    let mode: SignInView.Mode

    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var errorMessage: String?
    @State private var infoMessage: String?
    @State private var isSubmitting = false

    var body: some View {
        VStack(spacing: 12) {
            if mode == .signUp {
                TextField("Your name", text: $name).textFieldStyle(.roundedBorder)
            }
            TextField("Email", text: $email)
                .textFieldStyle(.roundedBorder)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
            SecureField("Password", text: $password).textFieldStyle(.roundedBorder)

            if let errorMessage { Text(errorMessage).foregroundColor(.red).font(.footnote) }
            if let infoMessage { Text(infoMessage).foregroundColor(.green).font(.footnote) }

            Button(isSubmitting ? "Please wait…" : (mode == .signIn ? "Log in" : "Sign up")) {
                submit()
            }
            .buttonStyle(.borderedProminent)
            .disabled(isSubmitting || email.isEmpty || password.isEmpty)
        }
        .padding(.horizontal)
    }

    private func submit() {
        isSubmitting = true
        errorMessage = nil
        infoMessage = nil
        Task {
            do {
                if mode == .signUp {
                    try await authStore.signUp(email: email, password: password, name: name)
                    infoMessage = "Check your email to confirm your account, then log in."
                } else {
                    try await authStore.signIn(email: email, password: password)
                }
            } catch {
                errorMessage = error.localizedDescription
            }
            isSubmitting = false
        }
    }
}

private struct PhoneAuthForm: View {
    @EnvironmentObject var authStore: AuthStore
    let mode: SignInView.Mode

    @State private var step: Step = .phone
    @State private var name = ""
    @State private var phone = ""
    @State private var code = ""
    @State private var errorMessage: String?
    @State private var isSubmitting = false

    enum Step { case phone, code }

    var body: some View {
        VStack(spacing: 12) {
            if step == .phone {
                if mode == .signUp {
                    TextField("Your name", text: $name).textFieldStyle(.roundedBorder)
                }
                TextField("+1 555 123 4567", text: $phone)
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.phonePad)
                Text("Include your country code, starting with +.")
                    .font(.caption).foregroundColor(.secondary)
            } else {
                Text("Enter the code we texted to \(phone).").font(.footnote)
                TextField("123456", text: $code)
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.numberPad)
            }

            if let errorMessage { Text(errorMessage).foregroundColor(.red).font(.footnote) }

            Button(isSubmitting ? "Please wait…" : (step == .phone ? "Send code" : "Verify & continue")) {
                submit()
            }
            .buttonStyle(.borderedProminent)
            .disabled(isSubmitting || (step == .phone ? !phone.hasPrefix("+") : code.count < 4))
        }
        .padding(.horizontal)
    }

    private func submit() {
        isSubmitting = true
        errorMessage = nil
        Task {
            do {
                let normalized = "+" + phone.trimmingCharacters(in: .whitespaces).filter(\.isNumber)
                if step == .phone {
                    phone = normalized
                    try await authStore.sendPhoneOtp(phone: normalized, name: mode == .signUp ? name : nil)
                    step = .code
                } else {
                    try await authStore.verifyPhoneOtp(phone: phone, code: code)
                }
            } catch {
                errorMessage = error.localizedDescription
            }
            isSubmitting = false
        }
    }
}
