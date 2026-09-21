from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


class NarrationDeploymentTests(unittest.TestCase):
    def run_deploy(
        self, provider: str | None = None, *, llm: str | None = None,
        video_llm: str | None = None, web: bool = False
    ) -> list[list[str]]:
        with tempfile.TemporaryDirectory() as work:
            root = Path(work)
            service = root / "services" / "video-renderer"
            service.mkdir(parents=True)
            shutil.copy(Path(__file__).resolve().parent.parent / "deploy.sh", service)
            if web:
                web_script = (
                    Path(__file__).resolve().parent.parent.parent.parent / "deploy.sh"
                )
                if not web_script.is_file():
                    self.skipTest(
                        "Web deployment script is outside the standalone renderer image"
                    )
                shutil.copy(web_script, root)
            (root / ".env").write_text(
                "VIDEO_TTS_PROVIDER=azure\n"
                "AZURE_TTS_API_KEY=private-test-value\n"
                "AZURE_TTS_ENDPOINT='https://example.openai.azure.com/openai/deployments/tts/audio/speech?api-version=2025-03-01-preview'\n"
                "VIDEO_TTS_STYLE='Warm, precise tutor.'\n"
                "AZURE_LLM_API_KEY=private-test-value\n"
                "AZURE_LLM_ENDPOINT=https://example.services.ai.azure.com/openai/v1/responses\n"
            )
            calls = root / "calls.jsonl"
            command = root / "gcloud"
            command.write_text(
                f"#!{sys.executable}\n"
                "import json, os, sys\n"
                "args = sys.argv[1:]\n"
                "with open(os.environ['TEST_CLOUD_CALLS'], 'a') as output:\n"
                "    output.write(json.dumps(args) + '\\n')\n"
                "if args[:3] == ['secrets', 'versions', 'list']:\n"
                "    print('7' if 'azure' in args[3] else '3')\n"
                "elif '--format=value(status.latestCreatedRevisionName)' in args:\n"
                "    print('renderer-test-revision')\n"
                "elif '--format=value(status.url)' in args:\n"
                "    print('https://renderer.example.test')\n"
            )
            command.chmod(0o755)
            env = {
                "PATH": f"{root}:{os.environ.get('PATH', os.defpath)}",
                "TEST_CLOUD_CALLS": str(calls),
                "VIDEO_IMAGE_TAG": "test",
                "VIDEO_SKIP_BUILD": "true",
                "VIDEO_UPDATE_WEB_SERVICE": "false",
                "DEPLOY_SKIP_BUILD": "true",
                "DEPLOY_IMAGE_TAG": "test",
            }
            if llm is not None:
                env["LLM_PROVIDER"] = llm
            if video_llm is not None:
                env["VIDEO_LLM_PROVIDER"] = video_llm
            if web:
                for name in [
                    "API_KEY",
                    "AUTH_DOMAIN",
                    "PROJECT_ID",
                    "STORAGE_BUCKET",
                    "MESSAGING_SENDER_ID",
                    "APP_ID",
                ]:
                    env[f"NEXT_PUBLIC_FIREBASE_{name}"] = "test-public-value"
                env["NEXT_PUBLIC_TURNSTILE_SITE_KEY"] = "test-site-key"
                env["TELEGRAM_CHAT_ID"] = "12345"
            if provider is not None:
                env["VIDEO_TTS_PROVIDER"] = provider
            result = subprocess.run(
                ["bash", str((root if web else service) / "deploy.sh")],
                env=env,
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertNotIn("private-test-value", result.stdout + result.stderr)
            commands = [json.loads(line) for line in calls.read_text().splitlines()]
            self.assertNotIn("private-test-value", json.dumps(commands))
            return commands

    def test_azure_uses_pinned_secrets_and_preserves_style(self) -> None:
        commands = self.run_deploy()
        deploy = next(args for args in commands if args[:2] == ["run", "deploy"])
        secrets = deploy[deploy.index("--set-secrets") + 1]
        self.assertIn("GOOGLE_CLOUD_API_KEY=mathsolver-gemini-api-key:3", secrets)
        self.assertIn("AZURE_TTS_API_KEY=mathsolver-azure-tts-api-key:7", secrets)
        variables = deploy[deploy.index("--set-env-vars") + 1]
        self.assertIn("|VIDEO_TTS_PROVIDER=azure|", variables)
        self.assertIn("|VIDEO_TTS_STYLE=Warm, precise tutor.|", variables)
        self.assertIn("?api-version=2025-03-01-preview", variables)
        self.assertIn("--no-allow-unauthenticated", deploy)

    def test_explicit_gemini_override_needs_no_azure_secret(self) -> None:
        commands = self.run_deploy("gemini")
        deploy = next(args for args in commands if args[:2] == ["run", "deploy"])
        self.assertEqual(
            deploy[deploy.index("--set-secrets") + 1],
            "GOOGLE_CLOUD_API_KEY=mathsolver-gemini-api-key:3",
        )
        self.assertIn(
            "|VIDEO_TTS_PROVIDER=gemini|", deploy[deploy.index("--set-env-vars") + 1]
        )
        self.assertFalse(
            any("mathsolver-azure-tts-api-key" in args for args in commands)
        )

    def test_renderer_llm_and_voice_switches_are_independent(self) -> None:
        commands = self.run_deploy("gemini", llm="azure")
        deploy = next(args for args in commands if args[:2] == ["run", "deploy"])
        self.assertIn(
            "AZURE_LLM_API_KEY=mathsolver-video-azure-llm-api-key:7",
            deploy[deploy.index("--set-secrets") + 1],
        )
        variables = deploy[deploy.index("--set-env-vars") + 1]
        self.assertIn("|LLM_PROVIDER=azure|", variables)
        self.assertIn("|AZURE_LLM_DEPLOYMENT=gpt-4.1-nano", variables)
        self.assertIn("|VIDEO_TTS_PROVIDER=gemini|", variables)

    def test_web_deploy_preserves_contact_config_with_pinned_azure_secret(self) -> None:
        commands = self.run_deploy(llm="azure", web=True)
        deploy = next(args for args in commands if args[:2] == ["run", "deploy"])
        self.assertIn(
            "AZURE_LLM_API_KEY=mathsolver-web-azure-llm-api-key:7",
            deploy[deploy.index("--update-secrets") + 1],
        )
        self.assertEqual(deploy.count("--update-env-vars"), 1)
        variables = deploy[deploy.index("--update-env-vars") + 1]
        self.assertIn("LLM_PROVIDER=azure|", variables)
        self.assertIn("|AZURE_LLM_DEPLOYMENT=gpt-4.1-nano", variables)
        self.assertIn("|TELEGRAM_CHAT_ID=12345|", variables)

    def test_video_planning_override_is_preserved_separately_from_web_model(self) -> None:
        commands = self.run_deploy("azure", llm="azure", video_llm="gemini")
        deploy = next(args for args in commands if args[:2] == ["run", "deploy"])
        variables = deploy[deploy.index("--set-env-vars") + 1]
        self.assertIn("|LLM_PROVIDER=gemini|VIDEO_LLM_PROVIDER=gemini", variables)
        self.assertIn("|VIDEO_TTS_PROVIDER=azure|", variables)
        self.assertNotIn("AZURE_LLM_API_KEY=", deploy[deploy.index("--set-secrets") + 1])

    def test_web_gemini_rollback_does_not_require_azure(self) -> None:
        commands = self.run_deploy(llm="gemini", web=True)
        deploy = next(args for args in commands if args[:2] == ["run", "deploy"])
        self.assertNotIn(
            "AZURE_LLM_API_KEY=", deploy[deploy.index("--update-secrets") + 1]
        )
        self.assertIn(
            "LLM_PROVIDER=gemini|", deploy[deploy.index("--update-env-vars") + 1]
        )


if __name__ == "__main__":
    unittest.main()
