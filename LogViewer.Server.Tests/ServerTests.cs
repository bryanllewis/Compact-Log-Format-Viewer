using System.IO;
using System.Linq;
using LogViewer.Server.Hubs;
using LogViewer.Server.Models;
using Microsoft.AspNetCore.SignalR;
using Moq;
using NUnit.Framework;
using Serilog;

namespace LogViewer.Server.Tests
{
    public class ServerTests
    {
        const string _logfileName = "UmbracoTraceLog.UNITTEST.20181112.json";
        private string _logfilePath;

        [SetUp]
        public void Setup()
        {
            _logfilePath = Path.Combine(TestContext.CurrentContext.TestDirectory, _logfileName);
        }

        [Test]
        public void Logs_Contain_Correct_Error_Count()
        {
            var mockedHub = new Mock<IHubContext<LogHub>>();

            //Log Parser
            var parser = new LogParser(mockedHub.Object);
            
            //Open/parse the file into memory
            parser.ReadLogs(_logfilePath);

            //Once a file been read/open we can call further methods
            var errors = parser.TotalErrors();

            Assert.AreEqual(errors, 2);
        }

        [Test]
        public void Logs_Contain_Correct_Log_Level_Counts()
        {
            var mockedHub = new Mock<IHubContext<LogHub>>();

            //Log Parser
            var parser = new LogParser(mockedHub.Object);

            //Open/parse the file into memory
            parser.ReadLogs(_logfilePath);

            var logCounts = parser.TotalCounts();

            Assert.AreEqual(385, logCounts.Verbose);
            Assert.AreEqual(1954, logCounts.Debug);
            Assert.AreEqual(62, logCounts.Information);
            Assert.AreEqual(7, logCounts.Warning);
            Assert.AreEqual(2, logCounts.Error);
            Assert.AreEqual(0, logCounts.Fatal);
        }

        [Test]
        public void Logs_Contains_Correct_Message_Templates()
        {
            var mockedHub = new Mock<IHubContext<LogHub>>();

            //Log Parser
            var parser = new LogParser(mockedHub.Object);

            //Open/parse the file into memory
            parser.ReadLogs(_logfilePath);

            //Once a file been read/open we can call further methods
            var results = parser.Search();
            var templates = results.MessageTemplates;

            //Count no of templates
            Assert.AreEqual(43, templates.Count());

            //Verify all templates & counts are unique
            CollectionAssert.AllItemsAreUnique(templates);

            //Ensure the collection contains LogTemplate objects
            CollectionAssert.AllItemsAreInstancesOfType(templates, typeof(LogTemplate));

            //Get first item & verify its template & count are what we expect
            var popularTemplate = templates.FirstOrDefault();

            Assert.IsNotNull(popularTemplate);
            Assert.AreEqual("{LogPrefix} Task added {TaskType}", popularTemplate.MessageTemplate);
            Assert.AreEqual(689, popularTemplate.Count);
        }


        [TestCase("", 2410)]        
        [TestCase("Has(@Exception)", 2)]
        [TestCase("IsDefined(@x)", 2)]
        [TestCase("IsDefined(Duration) and Duration > 1000", 13)]
        [TestCase("Has(@x)", 2)]
        [TestCase("Has(Duration) and Duration > 1000", 13)]
        [TestCase("Duration > 1000", 13)]
        [TestCase("Not(@Level = 'Verbose') and Not(@Level = 'Debug')", 71)]
        [TestCase("Not(@l = 'Verbose') and Not(@l = 'Debug')", 71)]
        [TestCase("StartsWith(SourceContext, 'Umbraco.Core')", 1183)]
        [TestCase("@MessageTemplate = '{EndMessage} ({Duration}ms) [Timing {TimingId}]'", 622)]
        [TestCase("@mt = '{EndMessage} ({Duration}ms) [Timing {TimingId}]'", 622)]
        [TestCase("SortedComponentTypes[?] = 'Umbraco.Web.Search.ExamineComponent'", 1)]
        [TestCase("Contains(SortedComponentTypes[?], 'DatabaseServer')", 1)]
        [TestCase("@Message like '%localhost%'", 388)]
        [TestCase("@m like '%localhost%'", 388)]
        [TestCase("runtime", 7)]
        [Test]
        public void Logs_Can_Query_With_Expressions(string queryToVerify, int expectedCount)
        {
            var mockedHub = new Mock<IHubContext<LogHub>>();

            //Log Parser
            var parser = new LogParser(mockedHub.Object);

            //Open/parse the file into memory
            parser.ReadLogs(_logfilePath);

            var testQuery = parser.Search(pageNumber: 1, filterExpression: queryToVerify);

            Assert.AreEqual(expectedCount, testQuery.Logs.TotalItems);
        }

        [Test]
        public void Rendered_Message_Does_Not_Quote_String_Values()
        {
            var mockedHub = new Mock<IHubContext<LogHub>>();
            var parser = new LogParser(mockedHub.Object);

            var logFile = Path.GetTempFileName();
            File.WriteAllText(logFile, "{\"@t\":\"2026-10-04T17:48:58.203+00:00\",\"@mt\":\"HTTP {RequestMethod} {RequestPath}{QueryString} responded {StatusCode} in {Elapsed:0.0} ms\",\"@r\":[\"0.4\"],\"@l\":\"Information\",\"QueryString\":\"\",\"RequestMethod\":\"POST\",\"RequestPath\":\"/api/values\",\"StatusCode\":200,\"Elapsed\":0.398}");

            try
            {
                parser.ReadLogs(logFile);

                var log = parser.Search().Logs.Items.Single();

                Assert.AreEqual("HTTP POST /api/values responded 200 in 0.4 ms", log.RenderedMessage);
            }
            finally
            {
                parser.Dispose();
                File.Delete(logFile);
            }
        }

        [Test]
        public void HasFileChanged_Detects_Appended_Log_Entries()
        {
            // Mock the hub fully, as the FileSystemWatcher will notify Clients.All when the file is appended to
            var mockedHub = new Mock<IHubContext<LogHub>> { DefaultValue = DefaultValue.Mock };
            var parser = new LogParser(mockedHub.Object);

            const string logLine = "{\"@t\":\"2026-10-04T17:48:58.203+00:00\",\"@mt\":\"Hello {Name}\",\"@l\":\"Information\",\"Name\":\"World\"}\n";
            var logFile = Path.GetTempFileName();
            File.WriteAllText(logFile, logLine);

            try
            {
                Assert.IsFalse(parser.HasFileChanged(), "No file has been opened yet");

                parser.ReadLogs(logFile);
                Assert.IsFalse(parser.HasFileChanged(), "File has not changed since it was read");

                File.AppendAllText(logFile, logLine);
                Assert.IsTrue(parser.HasFileChanged(), "File has new entries appended");

                parser.ReadLogs(logFile);
                Assert.IsFalse(parser.HasFileChanged(), "File has been re-read");
                Assert.AreEqual(2, parser.Search().Logs.TotalItems);
            }
            finally
            {
                parser.Dispose();
                File.Delete(logFile);
            }
        }

        [TestCase("RequestMethod = 'POST'", 2)]
        [TestCase("RequestMethod=\"POST\"", 2)]
        [TestCase("RequestMethod = \"GET\"", 1)]
        [TestCase("RequestMethod = \"POST\" and RequestPath like '%values%'", 1)]
        [TestCase("RequestPath = \"/api/it's\"", 1)]
        [TestCase("RequestPath = \"/api/say \"\"hi\"\"\"", 1)]
        [TestCase("RequestPath like '%\"%'", 1)]
        public void Logs_Can_Query_With_Double_Quoted_Strings(string queryToVerify, int expectedCount)
        {
            var mockedHub = new Mock<IHubContext<LogHub>>();
            var parser = new LogParser(mockedHub.Object);

            var logFile = Path.GetTempFileName();
            File.WriteAllLines(logFile, new[]
            {
                "{\"@t\":\"2026-10-04T17:48:58.203+00:00\",\"@mt\":\"HTTP {RequestMethod} {RequestPath}\",\"RequestMethod\":\"POST\",\"RequestPath\":\"/api/values\"}",
                "{\"@t\":\"2026-10-04T17:48:59.203+00:00\",\"@mt\":\"HTTP {RequestMethod} {RequestPath}\",\"RequestMethod\":\"POST\",\"RequestPath\":\"/api/it's\"}",
                "{\"@t\":\"2026-10-04T17:49:00.203+00:00\",\"@mt\":\"HTTP {RequestMethod} {RequestPath}\",\"RequestMethod\":\"GET\",\"RequestPath\":\"/api/say \\\"hi\\\"\"}",
            });

            try
            {
                parser.ReadLogs(logFile);

                var testQuery = parser.Search(pageNumber: 1, filterExpression: queryToVerify);

                Assert.AreEqual(expectedCount, testQuery.Logs.TotalItems);
            }
            finally
            {
                parser.Dispose();
                File.Delete(logFile);
            }
        }

    }
}
