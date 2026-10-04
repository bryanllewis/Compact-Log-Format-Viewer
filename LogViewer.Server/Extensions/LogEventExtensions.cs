using System.Collections.Generic;
using System.IO;
using System.Linq;
using Serilog.Events;

namespace LogViewer.Server.Extensions
{
    public static class LogEventExtensions
    {
        /// <summary>
        /// Renders the message like LogEvent.RenderMessage() but without wrapping string property values in double-quotes
        /// </summary>
        public static string RenderMessageUnquoted(this LogEvent logEvent)
        {
            var properties = logEvent.Properties.ToDictionary(
                p => p.Key,
                p => p.Value is ScalarValue { Value: string text } ? new ScalarValue(new UnquotedString(text)) : p.Value);

            using var output = new StringWriter();
            logEvent.MessageTemplate.Render(properties, output);
            return output.ToString();
        }

        // ScalarValue only quotes System.String values, so wrapping the string makes it render as-is
        // while still honouring any alignment in the message template
        private sealed class UnquotedString
        {
            private readonly string _text;

            public UnquotedString(string text) => _text = text;

            public override string ToString() => _text;
        }
    }
}
