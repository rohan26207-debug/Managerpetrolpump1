package com.rohan.mpump;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.FileProvider;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private ValueCallback<Uri[]> fileUploadCallback;
    private static final int FILE_CHOOSER_REQUEST = 100;
    private static final String TAG = "ManagerPump";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);

        webView.addJavascriptInterface(new WebAppInterface(), "MPumpCalcAndroid");

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
                if (url.startsWith("blob:")) {
                    webView.evaluateJavascript(
                        "(function() {" +
                        "  var xhr = new XMLHttpRequest();" +
                        "  xhr.open('GET', '" + url + "', true);" +
                        "  xhr.responseType = 'blob';" +
                        "  xhr.onload = function() {" +
                        "    var reader = new FileReader();" +
                        "    reader.onloadend = function() {" +
                        "      var base64 = reader.result.split(',')[1];" +
                        "      MPumpCalcAndroid.openPdfWithViewer(base64, 'Report.pdf');" +
                        "    };" +
                        "    reader.readAsDataURL(xhr.response);" +
                        "  };" +
                        "  xhr.send();" +
                        "})();", null);
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileUploadCallback != null) {
                    fileUploadCallback.onReceiveValue(null);
                }
                fileUploadCallback = filePathCallback;
                Intent intent = fileChooserParams.createIntent();
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                } catch (Exception e) {
                    fileUploadCallback = null;
                    return false;
                }
                return true;
            }
        });

        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("file:///android_asset/www/index.html");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST && fileUploadCallback != null) {
            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK && data != null && data.getDataString() != null) {
                results = new Uri[]{Uri.parse(data.getDataString())};
            }
            fileUploadCallback.onReceiveValue(results);
            fileUploadCallback = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (webView != null) webView.destroy();
    }

    public class WebAppInterface {

        /**
         * Saves the PDF to BOTH the public Downloads folder (so the user sees it as a
         * "downloaded" file in the system Downloads app) AND the app-private folder
         * (used with FileProvider to launch the viewer immediately).
         */
        @JavascriptInterface
        public void openPdfWithViewer(String base64Data, String fileName) {
            try {
                byte[] pdfBytes = Base64.decode(base64Data, Base64.DEFAULT);

                // 1) Save to PUBLIC Downloads folder (visible in system Downloads app)
                String publicLocation = savePdfToDownloads(pdfBytes, fileName);

                // 2) Save to app-private folder for FileProvider -> Intent.ACTION_VIEW
                File dir = new File(getExternalFilesDir(null), "MPumpCalc");
                if (!dir.exists()) dir.mkdirs();
                File file = new File(dir, fileName);
                FileOutputStream fos = new FileOutputStream(file);
                fos.write(pdfBytes);
                fos.close();

                Uri uri = FileProvider.getUriForFile(
                    MainActivity.this,
                    getPackageName() + ".fileprovider",
                    file
                );

                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(uri, "application/pdf");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                Intent chooser = Intent.createChooser(intent, "Open PDF with");
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(chooser);

                final String msg = publicLocation != null
                    ? "Downloaded: " + publicLocation
                    : "PDF saved: " + fileName;
                runOnUiThread(() -> Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show());
            } catch (Exception e) {
                Log.e(TAG, "PDF error: " + e.getMessage(), e);
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show());
            }
        }

        /**
         * Writes the PDF to the public Downloads directory.
         * - Android 10+ (API 29): MediaStore.Downloads (no permission needed)
         * - Android 9 and below : Environment.DIRECTORY_DOWNLOADS (WRITE_EXTERNAL_STORAGE already granted at install for maxSdk=28)
         * Returns the user-visible path on success, null on failure.
         */
        private String savePdfToDownloads(byte[] pdfBytes, String fileName) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                    values.put(MediaStore.Downloads.MIME_TYPE, "application/pdf");
                    values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/MPumpCalc");
                    values.put(MediaStore.Downloads.IS_PENDING, 1);

                    Uri collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
                    Uri itemUri = getContentResolver().insert(collection, values);
                    if (itemUri == null) return null;

                    try (OutputStream os = getContentResolver().openOutputStream(itemUri)) {
                        if (os == null) return null;
                        os.write(pdfBytes);
                        os.flush();
                    }

                    values.clear();
                    values.put(MediaStore.Downloads.IS_PENDING, 0);
                    getContentResolver().update(itemUri, values, null, null);

                    return "Downloads/MPumpCalc/" + fileName;
                } else {
                    File downloads = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "MPumpCalc");
                    if (!downloads.exists()) downloads.mkdirs();
                    File target = new File(downloads, fileName);
                    try (FileOutputStream fos = new FileOutputStream(target)) {
                        fos.write(pdfBytes);
                    }
                    return "Downloads/MPumpCalc/" + fileName;
                }
            } catch (Exception e) {
                Log.e(TAG, "Downloads save error: " + e.getMessage(), e);
                return null;
            }
        }

        @JavascriptInterface
        public void savePdf(String base64Data, String fileName) {
            openPdfWithViewer(base64Data, fileName);
        }

        /**
         * Generates the PDF, saves it, and immediately launches an ACTION_SEND chooser
         * (WhatsApp / Email / Drive / Bluetooth / etc.) so the user can forward the
         * daily report in one tap.
         */
        @JavascriptInterface
        public void sharePdf(String base64Data, String fileName) {
            try {
                byte[] pdfBytes = Base64.decode(base64Data, Base64.DEFAULT);

                // Also drop a copy into public Downloads so it's archived
                savePdfToDownloads(pdfBytes, fileName);

                // Write to app-private folder for FileProvider share
                File dir = new File(getExternalFilesDir(null), "MPumpCalc");
                if (!dir.exists()) dir.mkdirs();
                File file = new File(dir, fileName);
                try (FileOutputStream fos = new FileOutputStream(file)) {
                    fos.write(pdfBytes);
                }

                Uri uri = FileProvider.getUriForFile(
                    MainActivity.this,
                    getPackageName() + ".fileprovider",
                    file
                );

                Intent shareIntent = new Intent(Intent.ACTION_SEND);
                shareIntent.setType("application/pdf");
                shareIntent.putExtra(Intent.EXTRA_STREAM, uri);
                shareIntent.putExtra(Intent.EXTRA_SUBJECT, fileName);
                shareIntent.putExtra(Intent.EXTRA_TEXT, "Daily Report - " + fileName);
                shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                Intent chooser = Intent.createChooser(shareIntent, "Share PDF via");
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(chooser);
            } catch (Exception e) {
                Log.e(TAG, "Share PDF error: " + e.getMessage(), e);
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Share failed: " + e.getMessage(), Toast.LENGTH_SHORT).show());
            }
        }

        @JavascriptInterface
        public void showToast(String message) {
            runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show());
        }
    }
}
