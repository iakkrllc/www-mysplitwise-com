package com.mysplitwise.app.ui.auth

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.mysplitwise.app.data.AuthRepository
import kotlinx.coroutines.launch

private enum class Mode { SIGN_IN, SIGN_UP }
private enum class Method { EMAIL, PHONE }

@Composable
fun SignInScreen() {
    var mode by remember { mutableStateOf(Mode.SIGN_IN) }
    var method by remember { mutableStateOf(Method.EMAIL) }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("mysplitwise", style = MaterialTheme.typography.headlineLarge, modifier = Modifier.padding(vertical = 24.dp))

        SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
            SegmentedButton(selected = mode == Mode.SIGN_IN, onClick = { mode = Mode.SIGN_IN }, shape = SegmentedButtonDefaults.itemShape(0, 2)) { Text("Log in") }
            SegmentedButton(selected = mode == Mode.SIGN_UP, onClick = { mode = Mode.SIGN_UP }, shape = SegmentedButtonDefaults.itemShape(1, 2)) { Text("Sign up") }
        }
        SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
            SegmentedButton(selected = method == Method.EMAIL, onClick = { method = Method.EMAIL }, shape = SegmentedButtonDefaults.itemShape(0, 2)) { Text("Email") }
            SegmentedButton(selected = method == Method.PHONE, onClick = { method = Method.PHONE }, shape = SegmentedButtonDefaults.itemShape(1, 2)) { Text("Phone") }
        }

        if (method == Method.EMAIL) EmailAuthForm(isSignUp = mode == Mode.SIGN_UP) else PhoneAuthForm(isSignUp = mode == Mode.SIGN_UP)
    }
}

@Composable
private fun EmailAuthForm(isSignUp: Boolean) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var infoMessage by remember { mutableStateOf<String?>(null) }
    var isSubmitting by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Column(modifier = Modifier.padding(top = 16.dp)) {
        if (isSignUp) {
            OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Your name") }, modifier = Modifier.fillMaxWidth())
        }
        OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
        OutlinedTextField(
            value = password, onValueChange = { password = it }, label = { Text("Password") },
            visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
        )
        errorMessage?.let { Text(it, modifier = Modifier.padding(top = 8.dp)) }
        infoMessage?.let { Text(it, modifier = Modifier.padding(top = 8.dp)) }
        Button(
            enabled = !isSubmitting && email.isNotBlank() && password.isNotBlank(),
            onClick = {
                isSubmitting = true
                errorMessage = null
                infoMessage = null
                scope.launch {
                    try {
                        if (isSignUp) {
                            AuthRepository.signUp(email, password, name)
                            infoMessage = "Check your email to confirm your account, then log in."
                        } else {
                            AuthRepository.signIn(email, password)
                        }
                    } catch (e: Exception) {
                        errorMessage = e.message ?: "Something went wrong"
                    } finally {
                        isSubmitting = false
                    }
                }
            },
            modifier = Modifier.padding(top = 16.dp),
        ) { Text(if (isSignUp) "Sign up" else "Log in") }
    }
}

@Composable
private fun PhoneAuthForm(isSignUp: Boolean) {
    var step by remember { mutableStateOf(0) } // 0 = phone, 1 = code
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isSubmitting by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Column(modifier = Modifier.padding(top = 16.dp)) {
        if (step == 0) {
            if (isSignUp) {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Your name") }, modifier = Modifier.fillMaxWidth())
            }
            OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("+1 555 123 4567") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
            Text("Include your country code, starting with +.", style = MaterialTheme.typography.bodySmall)
        } else {
            Text("Enter the code we texted to $phone.")
            OutlinedTextField(value = code, onValueChange = { code = it }, label = { Text("123456") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
        }
        errorMessage?.let { Text(it, modifier = Modifier.padding(top = 8.dp)) }
        Button(
            enabled = !isSubmitting && (if (step == 0) phone.startsWith("+") else code.length >= 4),
            onClick = {
                isSubmitting = true
                errorMessage = null
                scope.launch {
                    try {
                        val normalized = "+" + phone.trim().filter { it.isDigit() }
                        if (step == 0) {
                            phone = normalized
                            AuthRepository.sendPhoneOtp(normalized, if (isSignUp) name else null)
                            step = 1
                        } else {
                            AuthRepository.verifyPhoneOtp(phone, code)
                        }
                    } catch (e: Exception) {
                        errorMessage = e.message ?: "Something went wrong"
                    } finally {
                        isSubmitting = false
                    }
                }
            },
            modifier = Modifier.padding(top = 16.dp),
        ) { Text(if (step == 0) "Send code" else "Verify & continue") }
    }
}
